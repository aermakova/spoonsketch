import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importRecipesFromJson, type JsonImportResult } from '../api/ai';
import { track } from '../lib/analytics';

export function useImportRecipesJson() {
  const qc = useQueryClient();
  return useMutation<JsonImportResult, Error, { recipes: unknown[] }>({
    mutationFn: ({ recipes }) => importRecipesFromJson(recipes),
    onSuccess: (result) => {
      // Even on partial-failure (some inserted, some skipped), refresh
      // the library so the inserted ones show up immediately.
      if (result.inserted > 0) {
        qc.invalidateQueries({ queryKey: ['recipes'] });
        // Fire one recipe_created per inserted recipe so cohort analysis
        // counts each one. Funnels can group by source='json' to see bulk
        // imports specifically.
        for (let i = 0; i < result.inserted; i++) {
          track('recipe_created', { source: 'json' });
        }
      }
    },
  });
}
