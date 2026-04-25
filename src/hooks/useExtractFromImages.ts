import { useMutation } from '@tanstack/react-query';
import { extractRecipeFromImages, extractRecipeFromDocument } from '../api/ai';
import type { ExtractedRecipe } from '../types/ai';

export interface UseExtractFromImagesInput {
  imageUrls: string[];
  locale?: string;
}

export function useExtractFromImages() {
  return useMutation<ExtractedRecipe, Error, UseExtractFromImagesInput>({
    mutationFn: ({ imageUrls, locale }) => extractRecipeFromImages(imageUrls, locale),
  });
}

export type UseExtractFromDocumentInput =
  | { pdfUrl: string; locale?: string }
  | { textContent: string; locale?: string };

export function useExtractFromDocument() {
  return useMutation<ExtractedRecipe, Error, UseExtractFromDocumentInput>({
    mutationFn: (input) => {
      const { locale, ...rest } = input;
      return extractRecipeFromDocument(rest, locale);
    },
  });
}
