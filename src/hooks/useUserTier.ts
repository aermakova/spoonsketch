// useUserTier — reads `users.tier` for the signed-in user. Cached for 5 min;
// refetched on focus when `users.tier` realistically changes (RevenueCat
// webhook flips it after a successful purchase).
//
// Returns 'free' as the default while loading or unauthenticated. Premium
// gating UI should treat 'undefined'/'free' identically to keep things simple.

import { useQuery } from '@tanstack/react-query';
import { fetchUserTier, type UserTier } from '../api/auth';
import { useAuth } from './useAuth';

const FIVE_MIN = 5 * 60 * 1000;

export function useUserTier(): UserTier {
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data } = useQuery({
    queryKey: ['userTier', userId],
    queryFn: () => fetchUserTier(userId!),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });

  return data ?? 'free';
}
