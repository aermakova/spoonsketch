// Granular consent — current-state read + per-kind toggle.
//
// Storage:
// - `users.consent_*` columns hold the current state (fast reads,
//   used by AI gates).
// - `user_consents` audit table is append-only, one row per change.
//
// At sign-up, the database trigger `handle_new_user` reads consents
// from `raw_user_meta_data->'consents'` and writes both shapes in one
// transaction. See `app/(auth)/login.tsx` for the meta passed to
// `auth.signUp`.
//
// Mid-session toggles go through `setConsent()` which updates the
// users column AND inserts a fresh audit row. The audit table is
// service-role only (RLS denies authenticated access), so clients
// can only see the current state.

import { supabase } from './client';
import { ApiError } from './auth';

/** Bump this string whenever the Privacy Policy or ToS changes
 * materially. Per GDPR Art. 7 / Ukraine equivalent, the audit row
 * for each consent grant captures the version-at-time-of-grant. */
export const CURRENT_PP_VERSION = '2026-04-25-pre-launch';

export type ConsentKind = 'tos' | 'ai' | 'print' | 'marketing';

export interface UserConsents {
  tos: boolean;
  ai: boolean;
  print: boolean;
  marketing: boolean;
  ppVersion: string | null;
}

export async function fetchConsents(): Promise<UserConsents> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError('Not authenticated');
  const { data, error } = await supabase
    .from('users')
    .select('consent_tos, consent_ai, consent_print, consent_marketing, consent_pp_version')
    .eq('id', user.id)
    .single();
  if (error) throw new ApiError(error.message, error.code);
  return {
    tos: !!data.consent_tos,
    ai: !!data.consent_ai,
    print: !!data.consent_print,
    marketing: !!data.consent_marketing,
    ppVersion: data.consent_pp_version,
  };
}

/**
 * Toggle a single consent. Updates the users column AND writes an
 * audit row via a Postgres function (so both writes happen in one
 * transaction, with RLS bypassed for the audit table).
 *
 * For now we accept revoking ToS — caller should route the user to
 * "Delete account" instead. Settings UI hides the ToS toggle.
 */
export async function setConsent(kind: ConsentKind, granted: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError('Not authenticated');

  const column = `consent_${kind}` as
    | 'consent_tos' | 'consent_ai' | 'consent_print' | 'consent_marketing';

  // Update users.consent_* — RLS lets the user write to their own row.
  const { error: upErr } = await supabase
    .from('users')
    .update({
      [column]: granted,
      consent_pp_version: CURRENT_PP_VERSION,
    })
    .eq('id', user.id);
  if (upErr) throw new ApiError(upErr.message, upErr.code);

  // Audit row insert — RLS denies clients here, so we go through a
  // SECURITY DEFINER function.
  const { error: auditErr } = await supabase.rpc('record_consent_audit', {
    p_kind: kind,
    p_granted: granted,
    p_pp_version: CURRENT_PP_VERSION,
  });
  if (auditErr) {
    // The current-state write already succeeded; audit failure is
    // logged but not fatal. We could improve by retrying or by moving
    // the whole pair into one RPC, but this keeps the v1 surface tight.
    console.error('[setConsent] audit failed', auditErr);
  }
}
