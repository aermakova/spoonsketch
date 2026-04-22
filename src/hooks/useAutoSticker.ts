import { useMutation } from '@tanstack/react-query';
import { autoSticker } from '../api/ai';
import type { AutoStickerResponse } from '../types/ai';

export function useAutoSticker() {
  return useMutation<AutoStickerResponse, Error, { recipeId: string }>({
    mutationFn: ({ recipeId }) => autoSticker(recipeId),
  });
}
