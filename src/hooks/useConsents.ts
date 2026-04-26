import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchConsents,
  setConsent,
  type ConsentKind,
  type UserConsents,
} from '../api/consent';

export const CONSENTS_QUERY_KEY = ['user-consents'] as const;

export function useConsents() {
  return useQuery<UserConsents>({
    queryKey: CONSENTS_QUERY_KEY,
    queryFn: fetchConsents,
    // Consent state changes are infrequent — let TanStack cache aggressively.
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetConsent() {
  const qc = useQueryClient();
  return useMutation<void, Error, { kind: ConsentKind; granted: boolean }>({
    mutationFn: ({ kind, granted }) => setConsent(kind, granted),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONSENTS_QUERY_KEY }),
  });
}
