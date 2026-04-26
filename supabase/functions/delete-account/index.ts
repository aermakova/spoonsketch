// Account deletion — GDPR Art. 17 erasure + Apple Guideline 5.1.1(v)
// + Ukraine Law on Personal Data Protection.
//
// Sequence:
//   1. Authenticate the user via JWT (`requireUser`).
//   2. Delete every object under `telegram-screenshots/<user_id>/`.
//      Storage doesn't cascade with the auth.users row.
//   3. Call `auth.admin.deleteUser(userId)` — removes the auth.users
//      row, which cascades to:
//        public.users → cookbooks → recipes → recipe_canvases →
//        canvas_elements / drawing_layers / drawing_strokes /
//        book_pages / pdf_exports / user_images / ai_jobs /
//        telegram_connections / telegram_jobs / telegram_auth_tokens /
//        moderation_events / user_consents / print_orders.
//      Every user-scoped table has `user_id … references public.users
//      on delete cascade` (verified across all migrations).
//   4. Return 200; client signs out + nav to /login.
//
// Vendor cleanup is manual / out of scope for v1:
//   - Anthropic: zero-retention by default (org-wide ZDR opt-in
//     verified per NEXT_STEPS.md vendor checklist), so nothing to
//     delete from their side.
//   - OpenAI: per DPA, deletion request via support if any user data
//     was sent. Recipe-image generation (planned) doesn't run yet.
//   - Telegram: bot connection is server-deleted via the cascade;
//     Telegram itself owns the user's handle/ID, not us.
//   - Lulu: print-order shipping addresses are owned by Lulu after
//     submission; their retention is governed by their DPA.
//
// Failure modes:
//   - Storage list/remove fails → log + continue. Better to delete
//     the account than leave it half-broken because of an orphaned
//     image. Worst-case orphan files are gibberish bytes with no
//     user reference; we can sweep later.
//   - auth.admin.deleteUser fails → 500 to client; user retries.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handlePreflight } from '../_shared/cors.ts';
import { jsonError, jsonResponse } from '../_shared/errors.ts';
import { requireUser } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const STORAGE_BUCKETS = ['telegram-screenshots'] as const;

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed');

  if (!supabaseAdmin) {
    return jsonError(500, 'server_misconfigured', 'Missing Supabase env');
  }

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const userId = ctx.userId;

  // 1. Best-effort storage cleanup. List + remove every file under
  //    `<user_id>/` in every bucket we use. Failures here don't abort
  //    the deletion — orphan files are isolated and we can sweep
  //    later via a periodic job.
  for (const bucket of STORAGE_BUCKETS) {
    try {
      const { data: files, error: listErr } = await supabaseAdmin.storage
        .from(bucket)
        .list(userId, { limit: 1000 });
      if (listErr) {
        console.error(`[delete-account] list ${bucket} failed`, listErr);
        continue;
      }
      if (files && files.length > 0) {
        const paths = files.map((f) => `${userId}/${f.name}`);
        const { error: removeErr } = await supabaseAdmin.storage
          .from(bucket)
          .remove(paths);
        if (removeErr) {
          console.error(`[delete-account] remove from ${bucket} failed`, removeErr);
        }
      }
    } catch (e) {
      console.error(`[delete-account] storage cleanup threw for ${bucket}`, e);
    }
  }

  // 2. Hard delete the auth.users row. Cascades take care of every
  //    user-scoped row in public.* via the existing FK constraints.
  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    console.error('[delete-account] auth.admin.deleteUser failed', deleteErr);
    return jsonError(
      500,
      'delete_failed',
      'Could not delete your account. Please try again or contact support.',
    );
  }

  console.log('[delete-account] deleted user', userId);
  return jsonResponse({ ok: true });
});
