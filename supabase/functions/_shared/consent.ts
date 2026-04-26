// Server-side AI consent gate. Returns null when the user has
// granted consent_ai (caller proceeds), or a 403 Response when they
// haven't (caller short-circuits).
//
// Used by `extract-recipe` and `auto-sticker` right after auth.
// `import-recipes-json` and `moderate-image` skip this gate because
// they don't invoke Haiku for user-feature purposes (json_import
// just inserts; moderate-image is a compliance scan, not a
// user-controllable AI feature).

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { jsonError } from './errors.ts';

export async function requireAiConsent(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<Response | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('consent_ai')
    .eq('id', userId)
    .single();
  if (error) {
    // Fail closed — don't let an unreachable users row default to
    // "consent granted." Better to surface a transient error.
    console.error('[requireAiConsent] DB error', error);
    return jsonError(503, 'consent_check_failed', 'Could not verify consent. Please try again.');
  }
  if (!data?.consent_ai) {
    return jsonError(
      403,
      'consent_required',
      'AI features are turned off for your account. Enable them in Settings → Privacy.',
    );
  }
  return null;
}
