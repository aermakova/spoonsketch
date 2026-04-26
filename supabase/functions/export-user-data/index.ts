// Data export — GDPR Art. 20 (right to data portability) + Ukraine
// PDP equivalent. Returns the user's data as a single JSON document.
//
// V1 design: response delivers the JSON directly (no email, no signed
// URL, no separate Storage bucket). The client writes the bytes to
// expo-file-system's documentDirectory and hands off to
// expo-sharing's system share sheet so the user can save to Files /
// iCloud Drive / send themselves an email. Simpler than coordinating
// SMTP + signed URL TTLs for the v1 launch bar.
//
// Rate limit: one export per 24h per user, enforced via the
// `users.last_data_export_at` column. Repeated attempts get 429.
//
// Sensitive exclusions (per PLAN.md §19):
//   - push_token (deliverable; not portable identity)
//   - oauth tokens (auth.users.* never crosses this boundary)
//   - service-role-only audit rows: `moderation_events`,
//     `ai_jobs.input_data` / `output_data` / `model_response`,
//     `user_consents` (the user already has the current state via
//     `users.consent_*`, the audit log is for our compliance, not
//     theirs to replay)
//   - storage signed URLs (would expire by the time the user reads
//     the export)
// Included:
//   - users row (sans push_token, recipes_count is a derived counter)
//   - cookbooks (all)
//   - recipes (with full ingredients + instructions JSON)
//   - print_orders (their order history)
//   - telegram_connections (handle only — telegram_id is theirs to
//     repossess if they want to switch services)
//   - ai_jobs_summary: { kind: count } per job_type — useful for
//     "I imported N recipes via the bot" without exposing input/
//     output payloads
//
// JSON shape is documented in BACKEND.md §"Data export shape".

import { handlePreflight } from '../_shared/cors.ts';
import { jsonError, jsonResponse } from '../_shared/errors.ts';
import { requireUser } from '../_shared/auth.ts';

const RATE_LIMIT_HOURS = 24;
const EXPORT_VERSION = 1;

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed');

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const userId = ctx.userId;
  const admin = ctx.supabaseAdmin;

  // Throttle check.
  const { data: throttleRow, error: throttleErr } = await admin
    .from('users')
    .select('last_data_export_at')
    .eq('id', userId)
    .single();
  if (throttleErr) {
    console.error('[export-user-data] throttle read failed', throttleErr);
    return jsonError(500, 'db_error', 'Could not read account state');
  }
  const lastExport = throttleRow?.last_data_export_at
    ? new Date(throttleRow.last_data_export_at)
    : null;
  if (lastExport) {
    const hoursSince = (Date.now() - lastExport.getTime()) / (1000 * 60 * 60);
    if (hoursSince < RATE_LIMIT_HOURS) {
      const retryAfterMs = (RATE_LIMIT_HOURS - hoursSince) * 60 * 60 * 1000;
      return jsonError(
        429,
        'rate_limited',
        `Data exports are limited to one per 24 hours. Try again in about ${Math.ceil((RATE_LIMIT_HOURS - hoursSince))} hours.`,
        {
          retry_after_ms: Math.round(retryAfterMs),
          last_export_at: throttleRow.last_data_export_at,
        },
      );
    }
  }

  // Pull every user-scoped surface in parallel.
  const [user, cookbooks, recipes, printOrders, telegram, aiJobs] = await Promise.all([
    admin
      .from('users')
      .select('id, email, username, avatar_url, tier, palette, paper_texture, language, consent_tos, consent_ai, consent_print, consent_marketing, consent_pp_version, recipes_count, cookbooks_count, created_at')
      .eq('id', userId)
      .single(),
    admin
      .from('cookbooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    admin
      .from('recipes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    admin
      .from('print_orders')
      .select('id, cookbook_id, recipe_ids, style, paper_size, page_count, status, watermarked, created_at, expires_at, error_message')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    admin
      .from('telegram_connections')
      .select('telegram_id, username, connected_at')
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('ai_jobs')
      .select('job_type, status')
      .eq('user_id', userId),
  ]);

  if (user.error) {
    console.error('[export-user-data] user read failed', user.error);
    return jsonError(500, 'db_error', 'Could not read account data');
  }

  // Aggregate ai_jobs into counts only — never include the raw
  // input/output payloads (those can contain image bytes / scraped
  // HTML / OpenAI responses we don't owe the user a copy of).
  const aiSummary: Record<string, { done: number; failed: number; total: number }> = {};
  if (aiJobs.data) {
    for (const row of aiJobs.data as Array<{ job_type: string; status: string }>) {
      const bucket = aiSummary[row.job_type] ?? { done: 0, failed: 0, total: 0 };
      bucket.total += 1;
      if (row.status === 'done') bucket.done += 1;
      if (row.status === 'failed') bucket.failed += 1;
      aiSummary[row.job_type] = bucket;
    }
  }

  // Mark the export as done before responding so two concurrent
  // requests can't both succeed (race-window optimistic).
  const now = new Date().toISOString();
  await admin
    .from('users')
    .update({ last_data_export_at: now })
    .eq('id', userId);

  const exportPayload = {
    schema_version: EXPORT_VERSION,
    exported_at: now,
    notes: {
      excluded_for_privacy: [
        'push_token',
        'oauth_tokens',
        'moderation_events (compliance audit, not portable)',
        'user_consents audit log (current state included on user row)',
        'ai_jobs payloads (image bytes / scraped HTML)',
        'storage signed URLs (would expire before you read this)',
      ],
      schema_doc: 'See BACKEND.md §"Data export shape"',
    },
    user: user.data,
    cookbooks: cookbooks.data ?? [],
    recipes: recipes.data ?? [],
    print_orders: printOrders.data ?? [],
    telegram_connection: telegram.data ?? null,
    ai_jobs_summary: aiSummary,
  };

  return jsonResponse(exportPayload);
});
