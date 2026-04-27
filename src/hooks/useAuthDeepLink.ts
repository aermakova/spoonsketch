// Listen for `spoonsketch://auth/...` deep links — fired when the user taps
// a link in a Supabase magic-link / password-reset email.
//
// Three flows we handle:
//
// 1. spoonsketch://auth/callback#access_token=...&refresh_token=...
//    → magic-link sign-in. Set the session and the AuthGate auto-routes to home.
//
// 2. spoonsketch://auth/reset#access_token=...&refresh_token=...&type=recovery
//    → password reset. Set the recovery session, then route to /(auth)/reset-password
//    where the user picks a new password.
//
// 3. spoonsketch://auth/callback?error=...
//    → expired link / invalid token. Surface a soft alert.
//
// Supabase's PKCE flow returns tokens in the URL fragment (#) which RN's
// `expo-linking` handles fine via `parsedUrl.hostname` + `parsedUrl.queryParams`.
// We use `supabase.auth.setSession` directly with the parsed tokens.
import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '../api/client';

interface ParsedAuthUrl {
  flow: 'callback' | 'reset' | 'unknown';
  accessToken?: string;
  refreshToken?: string;
  type?: string;
  errorMessage?: string;
}

function parseAuthUrl(url: string): ParsedAuthUrl | null {
  if (!url.startsWith('spoonsketch://')) return null;
  // Tokens come in either query string OR fragment depending on Supabase config.
  // Normalise both into a single object.
  const u = new URL(url.replace('spoonsketch://', 'https://_/'));
  const params = new URLSearchParams(u.search);
  // Replace leading '#' with '?' to reuse URLSearchParams.
  const fragmentParams = new URLSearchParams(u.hash.replace(/^#/, ''));
  const get = (k: string) =>
    fragmentParams.get(k) ?? params.get(k) ?? undefined;

  const path = u.pathname.replace(/^\//, '').toLowerCase();
  let flow: ParsedAuthUrl['flow'] = 'unknown';
  if (path === 'auth/callback' || path === 'callback') flow = 'callback';
  else if (path === 'auth/reset' || path === 'reset') flow = 'reset';

  return {
    flow,
    accessToken: get('access_token'),
    refreshToken: get('refresh_token'),
    type: get('type'),
    errorMessage: get('error_description') ?? get('error'),
  };
}

export function useAuthDeepLink(): void {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function handle(url: string | null) {
      if (cancelled || !url) return;
      const parsed = parseAuthUrl(url);
      if (!parsed || parsed.flow === 'unknown') return;

      if (parsed.errorMessage) {
        Alert.alert('Sign-in link issue', decodeURIComponent(parsed.errorMessage));
        return;
      }

      if (!parsed.accessToken || !parsed.refreshToken) {
        Alert.alert(
          'Sign-in link issue',
          "That link didn't carry a session. Try requesting a new one from the sign-in screen.",
        );
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
      });

      if (error) {
        Alert.alert('Sign-in link issue', error.message);
        return;
      }

      if (parsed.flow === 'reset' || parsed.type === 'recovery') {
        router.replace('/(auth)/reset-password');
      }
      // For 'callback' flow, AuthGate auto-routes to home once the session
      // listener fires — no explicit nav needed.
    }

    // Cold start: the link that opened the app.
    Linking.getInitialURL().then(handle).catch(() => { /* ignore */ });

    // Warm: links that arrive while the app is open.
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [router]);
}
