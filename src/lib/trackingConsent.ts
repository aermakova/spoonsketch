// Cookie / analytics consent — ePrivacy Directive (EU) gold-standard
// for non-essential trackers. Shown to ALL users at first launch
// (over-compliance is fine; geo-detection rabbit hole avoided), with
// reject-all parity to accept-all (CJEU Planet49 + national DPA
// guidance).
//
// Trackers gated on `accepted === true`:
//   - PostHog (product analytics) — to be installed.
//   - Any future Mixpanel / Amplitude / etc.
//
// Trackers NOT gated (treated as strictly-necessary / legitimate
// interests under ePrivacy + GDPR Art. 6(1)(f)):
//   - Sentry crash reporting — security/stability of the service.
//
// Storage: device-level via Zustand persist + the same MMKV wrapper
// that `canvasStore` uses. No user_row write — this is pre-auth and
// per-device. When the user signs up, the §C2 granular consent flow
// captures their broader consents at the user-row level; the
// device-level analytics choice stays separate (different scope:
// device vs identity).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import storage from './canvasStorage';

export type TrackingConsent = 'accepted' | 'rejected' | null;

interface TrackingConsentState {
  status: TrackingConsent;
  /** Timestamp of the last decision, ISO string. Audit trail for the user's reference (we don't ship it anywhere). */
  decidedAt: string | null;
  accept: () => void;
  reject: () => void;
  reset: () => void;
}

export const useTrackingConsent = create<TrackingConsentState>()(
  persist(
    (set) => ({
      status: null,
      decidedAt: null,
      accept: () => set({ status: 'accepted', decidedAt: new Date().toISOString() }),
      reject: () => set({ status: 'rejected', decidedAt: new Date().toISOString() }),
      reset: () => set({ status: null, decidedAt: null }),
    }),
    {
      name: 'spoonsketch-tracking-consent',
      storage: createJSONStorage(() => storage),
      version: 1,
    },
  ),
);
