// JSON Import — bulk-insert up to 20 user-pasted recipes without
// touching Haiku. The user runs their own ChatGPT/Claude/Gemini against
// a multi-recipe PDF using a prompt we supply (`src/lib/jsonImportPrompt.ts`),
// then pastes the JSON output back into the JSON tab. We sanitize every
// byte server-side, drop forbidden fields, and bulk-insert.
//
// Auth: standard JWT (`requireUser`). No bot mode.
// Quota: `json_import` AiJobType. Free = 5/month, Premium = unlimited.
// Per-import recipe cap: 20.
// Per-call body size cap: 500KB (DoS guard).
//
// Trust boundary lives entirely in `_shared/recipeSanitize.ts`. This
// file orchestrates: auth, rate limit, quota, parse, sanitize, insert,
// log, respond. Nothing else.

import { handlePreflight } from '../_shared/cors.ts';
import { jsonError, jsonResponse } from '../_shared/errors.ts';
import { requireUser } from '../_shared/auth.ts';
import {
  checkQuotaAllowed,
  checkRateLimit,
  getQuota,
} from '../_shared/tier.ts';
import { logAiJob } from '../_shared/ai.ts';
import { sanitizeRecipe, type SanitizedRecipe } from '../_shared/recipeSanitize.ts';

const MAX_RECIPES_PER_IMPORT = 20;
const MAX_BODY_BYTES = 500 * 1024;

interface FailedEntry {
  index: number;
  reason: string;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed');

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;

  // Cap body size BEFORE JSON.parse so a 50MB payload doesn't OOM us.
  const rawText = await req.text();
  if (rawText.length > MAX_BODY_BYTES) {
    return jsonError(413, 'payload_too_large', `Request body exceeds ${MAX_BODY_BYTES} bytes.`);
  }

  let body: { recipes?: unknown };
  try {
    body = rawText.length > 0 ? JSON.parse(rawText) : {};
  } catch {
    return jsonError(400, 'bad_request', 'Invalid JSON body');
  }

  const recipesRaw = body.recipes;
  if (!Array.isArray(recipesRaw)) {
    return jsonError(400, 'invalid_input', '`recipes` must be a JSON array');
  }
  if (recipesRaw.length === 0) {
    return jsonError(400, 'invalid_input', '`recipes` is empty');
  }
  if (recipesRaw.length > MAX_RECIPES_PER_IMPORT) {
    return jsonError(400, 'too_many_recipes', `Max ${MAX_RECIPES_PER_IMPORT} recipes per import.`, {
      received: recipesRaw.length,
      limit: MAX_RECIPES_PER_IMPORT,
    });
  }

  // Rate limit (per-user per-job-type; same 10s guard as other functions).
  const rate = await checkRateLimit(ctx.supabaseAdmin, ctx.userId, 'json_import');
  if (!rate.ok) {
    return jsonError(429, 'rate_limited', 'Too many requests', {
      retry_after_seconds: rate.retryAfterSeconds,
    });
  }

  // Monthly quota — pre-flight only. We don't pre-debit; the
  // `logAiJob` row written below is what counts toward the cap.
  const quota = await getQuota(ctx.supabaseAdmin, ctx.userId, 'json_import');
  const capped = checkQuotaAllowed(quota);
  if (capped) return jsonError(429, capped.error, undefined, capped);

  // Sanitize each entry. Failures are reported per-recipe; we don't
  // abort the whole batch on one bad row — best-effort import.
  const sanitized: SanitizedRecipe[] = [];
  const failed: FailedEntry[] = [];
  for (let i = 0; i < recipesRaw.length; i++) {
    const result = sanitizeRecipe(recipesRaw[i]);
    if (result.ok) sanitized.push(result.recipe);
    else failed.push({ index: i, reason: result.reason });
  }

  if (sanitized.length === 0) {
    // Don't burn the user's quota on an all-invalid batch.
    return jsonResponse({ inserted: 0, failed });
  }

  // Bulk insert. user_id comes from auth context — never trusted from
  // the client. RLS policy on `recipes` (owner-only) is the last gate.
  const insertRows = sanitized.map((r) => ({ ...r, user_id: ctx.userId }));
  const { error: insertErr, count } = await ctx.supabaseAdmin
    .from('recipes')
    .insert(insertRows, { count: 'exact' });

  if (insertErr) {
    await logAiJob({
      supabaseAdmin: ctx.supabaseAdmin,
      userId: ctx.userId,
      jobType: 'json_import',
      status: 'failed',
      input: { received: recipesRaw.length },
      errorMessage: `db_insert_failed: ${insertErr.message}`,
    });
    return jsonError(500, 'db_error', `Could not insert recipes: ${insertErr.message}`);
  }

  await logAiJob({
    supabaseAdmin: ctx.supabaseAdmin,
    userId: ctx.userId,
    jobType: 'json_import',
    status: 'done',
    input: { received: recipesRaw.length, inserted: count ?? sanitized.length },
    output: { inserted: count ?? sanitized.length, failed_count: failed.length },
    tokensUsed: 0,
    model: 'none',
  });

  return jsonResponse({
    inserted: count ?? sanitized.length,
    failed,
  });
});
