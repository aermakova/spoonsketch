import { useMutation } from '@tanstack/react-query';
import { extractRecipeFromUrl } from '../api/ai';
import type { ExtractedRecipe } from '../types/ai';

export interface UseExtractRecipeInput {
  url: string;
  locale?: string;
}

export function useExtractRecipe() {
  return useMutation<ExtractedRecipe, Error, UseExtractRecipeInput>({
    mutationFn: ({ url, locale }) => extractRecipeFromUrl(url, locale),
  });
}
