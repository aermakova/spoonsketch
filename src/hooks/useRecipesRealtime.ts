// Phase 8.4 — Live `recipes` subscription scoped to the current user.
//
// Mounted once at the tab navigator root (app/(tabs)/_layout.tsx). When the
// Telegram bot inserts a recipe via service-role, this hook gets the change
// over the realtime socket and invalidates TanStack queries so the library
// refreshes within a couple of seconds.
//
// RLS already restricts SELECT to the row's owner, and Supabase Realtime
// honours that — we never see other users' rows.

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/client';

export function useRecipesRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let subscription: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const channel = supabase
        .channel(`recipes:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'recipes',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            qc.invalidateQueries({ queryKey: ['recipes'] });
            const id =
              (payload.new as { id?: string } | null)?.id ??
              (payload.old as { id?: string } | null)?.id;
            if (id) {
              qc.invalidateQueries({ queryKey: ['recipe', id] });
            }
          },
        )
        .subscribe();
      subscription = channel;
    })();

    return () => {
      cancelled = true;
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [qc]);
}
