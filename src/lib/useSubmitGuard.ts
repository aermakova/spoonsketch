import { useCallback, useRef, useState } from 'react';

// Single-flight wrapper for async handlers that don't go through TanStack
// Query's useMutation. Use this for signOut, or any ad-hoc async onPress.
//
// Why not just useState(busy)? useState updates are async — a fast double
// tap can fire both handlers before the first setBusy(true) commits. The
// ref gives us a synchronous check; state drives the UI.
export function useSubmitGuard(): [boolean, (fn: () => Promise<unknown>) => Promise<void>] {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await fn();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);

  return [busy, run];
}
