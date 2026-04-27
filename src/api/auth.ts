import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from './client';
import { CURRENT_PP_VERSION } from './consent';

export class ApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Captured at sign-up. ToS+PP is implicit `true` (sign-up form
 * disables submit until the box is checked); AI / print / marketing
 * are user-controlled. The metadata travels through Supabase Auth's
 * `raw_user_meta_data` and is unpacked by the `handle_new_user`
 * Postgres trigger into the user row + audit log in one transaction.
 */
export interface SignUpConsents {
  ai: boolean;
  print: boolean;
  marketing: boolean;
}

export async function signUp(
  email: string,
  password: string,
  consents: SignUpConsents,
): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        consents: {
          tos: true,
          ai: consents.ai,
          print: consents.print,
          marketing: consents.marketing,
        },
        pp_version: CURRENT_PP_VERSION,
      },
    },
  });
  if (error) throw new ApiError(error.message, error.code);
}

/**
 * Sends a one-time-password (magic link) email. Supabase emails the user a
 * link that, when tapped, deep-links into `spoonsketch://auth/callback`
 * with the session token in the URL. The deep-link listener in
 * app/_layout.tsx consumes the URL and the auth state listener picks up the
 * new session.
 *
 * Required Supabase config: the redirect URL `spoonsketch://auth/callback`
 * must be allowed in the Supabase Dashboard under Authentication → URL
 * Configuration → Redirect URLs.
 */
export async function sendMagicLink(email: string): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
    throw new ApiError("That doesn't look like a valid email.", 'invalid_email');
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      emailRedirectTo: 'spoonsketch://auth/callback',
      // shouldCreateUser:false would block sign-up via magic link; we want
      // sign-in OR sign-up (the user has agreed to consents at sign-up time
      // either via password form or via Apple flow already, so OTP-only
      // signups carry the same default consent state as Apple).
      shouldCreateUser: true,
    },
  });
  if (error) throw new ApiError(error.message, error.code ?? 'magic_link_failed');
}

/**
 * Sends a password-reset email. Tapping the link deep-links into
 * `spoonsketch://auth/reset`; the deep-link listener routes to the
 * `/(auth)/reset-password` screen with a recovery session pre-loaded by
 * Supabase, so the screen can call `updatePassword(newPassword)`.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
    throw new ApiError("That doesn't look like a valid email.", 'invalid_email');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: 'spoonsketch://auth/reset',
  });
  if (error) throw new ApiError(error.message, error.code ?? 'reset_request_failed');
}

/**
 * Sets a new password for the currently-authenticated user. Used by the
 * reset-password screen after the user taps the link in their inbox AND by
 * any future "change password" surface in Me tab.
 *
 * The session must already be in the recovery state (Supabase moves the
 * user there automatically when they consume the reset link).
 */
export async function updatePassword(newPassword: string): Promise<void> {
  if (newPassword.length < 6) {
    throw new ApiError('Password must be at least 6 characters.', 'password_too_short');
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new ApiError(error.message, error.code ?? 'password_update_failed');
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new ApiError(error.message, error.code);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  // "Auth session missing" means the user is already signed out — not an error.
  if (error && !error.message.toLowerCase().includes('missing')) {
    throw new ApiError(error.message, error.code);
  }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new ApiError(error.message, error.code);
  return data.session;
}

/**
 * iOS-only. Throws `ApiError` on cancel + on any failure.
 *
 * Apple recommends a per-request nonce to prevent replay attacks: we
 * generate a random raw value, hash it (SHA-256), send the HASH to
 * Apple, receive the identityToken (which embeds the hash), and pass
 * the RAW nonce to Supabase. Supabase verifies the embedded hash
 * matches `sha256(rawNonce)` before issuing the session.
 *
 * Caller must guard with `Platform.OS === 'ios'` AND
 * `AppleAuthentication.isAvailableAsync()` — Apple Sign In is not on
 * older iOS versions.
 */
export async function signInWithApple(): Promise<void> {
  // 64 hex chars = 256 bits of entropy.
  const rawNonce = bytesToHex(Crypto.getRandomBytes(32));
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e: any) {
    // ERR_REQUEST_CANCELED: user dismissed the sheet — bubble up a
    // typed code so the caller can suppress the alert.
    if (e?.code === 'ERR_REQUEST_CANCELED') {
      throw new ApiError('Sign in cancelled', 'cancelled');
    }
    throw new ApiError(e?.message ?? 'Apple sign in failed');
  }

  if (!credential.identityToken) {
    throw new ApiError('Apple did not return an identity token');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw new ApiError(error.message, error.code);
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

/**
 * Hard-delete the user's account. Calls the `delete-account` Edge
 * Function which cascade-removes every user-scoped row + storage
 * object server-side. Then signs out locally so the auth state
 * listener routes the user back to /login.
 *
 * Apple Guideline 5.1.1(v) requires this to be in-app + immediate +
 * full delete (not deactivate). The caller is responsible for
 * confirming the user really wants to delete (typing "DELETE" per
 * PLAN.md §15 acceptance criteria).
 */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<
    { ok: true } | { error: string; message?: string }
  >('delete-account', { body: {} });
  if (error) {
    let body: { error?: string; message?: string } = {};
    try {
      const ctx = (error as { context?: { json?: () => Promise<unknown> } })?.context;
      if (ctx?.json) body = (await ctx.json()) as typeof body;
    } catch { /* noop */ }
    throw new ApiError(body.message ?? error.message, body.error ?? 'delete_failed');
  }
  if (!data || !('ok' in data)) {
    throw new ApiError('Account deletion returned no result', 'delete_failed');
  }
  // Server already nuked the auth.users row; this just clears the
  // local session token from expo-secure-store and triggers the
  // RootLayout's auth listener to navigate to /login.
  await supabase.auth.signOut().catch(() => { /* session is already gone */ });
}

/**
 * GDPR Art. 20 data portability. Fetches the export from the
 * `export-user-data` Edge Function and returns it as a JS object the
 * caller can serialize / share / save. The function rate-limits to
 * one export per 24h per user; the 429 response code with
 * `rate_limited` bubbles up as an `ApiError`.
 */
export async function exportUserData(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke<
    Record<string, unknown> | { error: string; message?: string }
  >('export-user-data', { body: {} });
  if (error) {
    let body: { error?: string; message?: string } = {};
    try {
      const ctx = (error as { context?: { json?: () => Promise<unknown> } })?.context;
      if (ctx?.json) body = (await ctx.json()) as typeof body;
    } catch { /* noop */ }
    throw new ApiError(body.message ?? error.message, body.error ?? 'export_failed');
  }
  if (!data) {
    throw new ApiError('Export returned no data', 'export_failed');
  }
  return data as Record<string, unknown>;
}

export type UserTier = 'free' | 'premium';

/**
 * Reads the current user's tier from the public.users row. RLS allows the
 * user to read their own row only, so this is safe to call from the client.
 * Returns 'free' on any error or missing row — fail-safe default keeps
 * premium gating closed when the network is sketchy.
 */
export async function fetchUserTier(userId: string): Promise<UserTier> {
  const { data, error } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single<{ tier: UserTier }>();
  if (error || !data) return 'free';
  return data.tier === 'premium' ? 'premium' : 'free';
}

/**
 * Initiates an email-address change. Supabase sends a confirmation email
 * to the NEW address — the change isn't applied to `auth.users` until the
 * user clicks the link in that email. The session keeps the old email
 * until then.
 *
 * Throws ApiError on any failure (invalid email format, address already in
 * use by another account, network).
 */
export async function changeEmail(newEmail: string): Promise<void> {
  const trimmed = newEmail.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
    throw new ApiError('That doesn\'t look like a valid email.', 'invalid_email');
  }
  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) throw new ApiError(error.message, error.code ?? 'email_change_failed');
}
