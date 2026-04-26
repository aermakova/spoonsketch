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
