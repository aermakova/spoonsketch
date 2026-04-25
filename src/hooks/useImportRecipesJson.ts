import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importRecipesFromJson, type JsonImportResult } from '../api/ai';

export function useImportRecipesJson() {
  const qc = useQueryClient();
  return useMutation<JsonImportResult, Error, { recipes: unknown[] }>({
    mutationFn: ({ recipes }) => importRecipesFromJson(recipes),
    onSuccess: (result) => {
      // Even on partial-failure (some inserted, some skipped), refresh
      // the library so the inserted ones show up immediately.
      if (result.inserted > 0) {
        qc.invalidateQueries({ queryKey: ['recipes'] });
      }
    },
  });
}
