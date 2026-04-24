// Phase 8.3 — TanStack-managed connection state for the Me tab.
//
// Polls/queries telegram_connections for the current user and subscribes to
// realtime INSERT/UPDATE/DELETE events on that row so the UI updates the
// instant the bot redeems a token (no manual refresh).

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/client';
import { fetchTelegramConnection, type TelegramConnection } from '../api/telegramAuth';

export function useTelegramConnection() {
  const qc = useQueryClient();
  const query = useQuery<TelegramConnection | null>({
    queryKey: ['telegramConnection'],
    queryFn: fetchTelegramConnection,
  });

  // Realtime subscription — when the bot writes the connection row, the UI
  // should flip from "Connect Telegram" to "Connected as @handle" within ~2s.
  useEffect(() => {
    let cancelled = false;
    let subscription: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const channel = supabase
        .channel(`telegram_connections:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'telegram_connections',
            filter: `user_id=eq.${user.id}`,
          },
          () => qc.invalidateQueries({ queryKey: ['telegramConnection'] }),
        )
        .subscribe();
      subscription = channel;
    })();

    return () => {
      cancelled = true;
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [qc]);

  return query;
}
