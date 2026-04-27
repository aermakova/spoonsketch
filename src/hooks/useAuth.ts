import { useState, useEffect } from 'react';
import { type Session } from '@supabase/supabase-js';
import { supabase } from '../api/client';
import { identify, resetAnalyticsUser } from '../lib/analytics';
import { setSentryUser } from '../lib/sentry';

// Pipe the session change into telemetry — PostHog associates events with
// the user id; Sentry tags crash reports. Both are safe no-ops without
// keys / consent. Logout calls the reset flavours so we don't leak the
// previous user's id into a fresh sign-in on the same device.
function syncTelemetryIdentity(session: Session | null) {
  if (session?.user.id) {
    identify(session.user.id, {
      email: session.user.email ?? null,
    });
    setSentryUser(session.user.id);
  } else {
    resetAnalyticsUser();
    setSentryUser(null);
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        syncTelemetryIdentity(data.session);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      syncTelemetryIdentity(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, loading, isSignedIn: !!session };
}
