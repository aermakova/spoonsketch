// Analytics wrapper around PostHog. No-op until EXPO_PUBLIC_POSTHOG_KEY is
// set (deferred — keys land when we're ready for real instrumentation).
//
// Usage:
//   import { track } from '../lib/analytics';
//   track('recipe_created', { source: 'url_import' });
//
// Adding a new event: extend the AnalyticsEvent type below FIRST so the
// payload shape is checked at the call site (per CLAUDE.md rule #6).
//
// Consent: PostHog is gated by the user's `analytics` toggle in the
// TrackingConsentBanner. capture()/identify() short-circuit when consent
// is denied. The TrackingConsentBanner state is read via the existing
// `useTrackingConsent` Zustand store.

import PostHog from 'posthog-react-native';
import { useTrackingConsent } from './trackingConsent';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let client: PostHog | null = null;

function ensureClient(): PostHog | null {
  if (!POSTHOG_KEY) return null;
  if (client) return client;
  client = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    captureAppLifecycleEvents: true,
    flushAt: 20,
    flushInterval: 30_000,
  });
  return client;
}

function consentGranted(): boolean {
  // The TrackingConsentBanner stores a single 'accepted'/'rejected' status
  // for non-essential trackers (PostHog, future Mixpanel/etc). Sentry is
  // separately treated as legitimate interest and is NOT gated.
  return useTrackingConsent.getState().status === 'accepted';
}

// ─── Event taxonomy ──────────────────────────────────────────────────
//
// Every event in the app must be a key of this map. Property shapes are
// type-checked at the call site.
export interface AnalyticsEventMap {
  // Onboarding
  onboarding_started: never;
  onboarding_completed: { intent?: 'gift' | 'personal' };

  // Auth
  signup_completed: { method: 'password' | 'magic_link' | 'apple' };
  login_completed: { method: 'password' | 'magic_link' | 'apple'; returning: boolean };
  password_reset_requested: never;

  // Recipes
  recipe_created: { source: 'manual' | 'url_import' | 'photo' | 'pdf' | 'json' | 'telegram' };
  recipe_decorated: { method: 'ai' | 'manual' | 'mix' };
  canvas_saved: { element_count: number };

  // Cook mode
  cook_session_started: { recipe_id: string; step_count: number };
  cook_session_completed: { recipe_id: string; step_count: number };

  // Monetization (future)
  paywall_shown: { trigger: string };
  paywall_dismissed: { trigger: string };
  subscription_started: { plan: 'monthly' | 'annual'; trigger: string };
}

export type AnalyticsEvent = keyof AnalyticsEventMap;

// PostHog's typed `EventProperties` requires its strict JsonType shape.
// We bypass via a typed-cast helper that checks at runtime any undefined
// values are dropped (PostHog rejects undefined). Our event-map values are
// already primitives, so this is safe.
function toPostHogProps(input: unknown): Record<string, string | number | boolean | null> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (v === undefined) continue;
    if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean' ||
      v === null
    ) {
      out[k] = v;
    }
  }
  return out;
}

export function track<E extends AnalyticsEvent>(
  event: E,
  ...args: AnalyticsEventMap[E] extends never ? [] : [props: AnalyticsEventMap[E]]
): void {
  if (!consentGranted()) return;
  const c = ensureClient();
  if (!c) return;
  const props = args[0];
  try {
    if (props) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      c.capture(event, toPostHogProps(props) as any);
    } else {
      c.capture(event);
    }
  } catch {
    /* never throw from analytics */
  }
}

export function identify(userId: string, traits?: Record<string, unknown>): void {
  if (!consentGranted()) return;
  const c = ensureClient();
  if (!c) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.identify(userId, toPostHogProps(traits) as any);
  } catch { /* noop */ }
}

export function resetAnalyticsUser(): void {
  if (!client) return;
  try {
    client.reset();
  } catch { /* noop */ }
}
