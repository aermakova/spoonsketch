// Sentry wrapper. No-op until EXPO_PUBLIC_SENTRY_DSN is set.
//
// Per the existing TrackingConsentBanner design (src/lib/trackingConsent.ts
// header), Sentry is NOT gated by the cookie banner — crash reporting is
// treated as a strictly-necessary / legitimate interest under GDPR Art.
// 6(1)(f). Only PostHog and friends are gated.
//
// Usage:
//   import { captureError } from '../lib/sentry';
//   try { ... } catch (e) { captureError(e, { context: 'recipe_save' }); }
//
// Error boundaries already wrap every tab + the editor; they should call
// captureError(error, errorInfo) from their componentDidCatch hook so we
// see crashes in production. (Wiring at the boundary is a follow-up.)

import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

let initialised = false;

export function ensureSentry(): void {
  if (initialised || !DSN) return;
  initialised = true;
  try {
    Sentry.init({
      dsn: DSN,
      // Only capture in production builds. Dev builds throw stacktraces
      // to the JS console which is more useful while iterating.
      enabled: !__DEV__,
      tracesSampleRate: 0.1,
      // Strip user PII by default. We can add explicit user.id via setUser
      // post-auth if it's helpful for triage.
      sendDefaultPii: false,
    });
  } catch { /* noop */ }
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!initialised) return;
  try {
    if (context) Sentry.captureException(err, { extra: context });
    else Sentry.captureException(err);
  } catch { /* never throw from telemetry */ }
}

export function setSentryUser(userId: string | null): void {
  if (!initialised) return;
  try {
    if (userId) Sentry.setUser({ id: userId });
    else Sentry.setUser(null);
  } catch { /* noop */ }
}
