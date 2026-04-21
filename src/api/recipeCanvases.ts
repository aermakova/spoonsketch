import { supabase } from './client';
import { ApiError } from './auth';
import type { CookbookTemplateKey, CookbookFontKey } from '../types/cookbook';

export interface RecipeCanvas {
  id: string;
  recipe_id: string;
  user_id: string;
  width: number;
  height: number;
  background_color: string;
  template_key: CookbookTemplateKey | null;
  recipe_font: CookbookFontKey | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

// Returns null when the recipe has no canvas row yet — a fresh recipe
// won't have one until the user saves an override.
export async function fetchRecipeCanvas(recipeId: string): Promise<RecipeCanvas | null> {
  const { data, error } = await supabase
    .from('recipe_canvases')
    .select('*')
    .eq('recipe_id', recipeId)
    .maybeSingle();
  if (error) throw new ApiError(error.message, error.code);
  return (data as RecipeCanvas | null) ?? null;
}

export interface RecipeCanvasOverrides {
  template_key?: CookbookTemplateKey | null;
  recipe_font?: CookbookFontKey | null;
}

// Upsert the per-recipe template / font override. Creates the row if
// it doesn't exist. user_id is derived from the auth session; RLS
// ensures the user can only write their own recipes.
export async function upsertRecipeCanvas(
  recipeId: string,
  patch: RecipeCanvasOverrides,
): Promise<RecipeCanvas> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError('Not authenticated');

  const { data, error } = await supabase
    .from('recipe_canvases')
    .upsert(
      { recipe_id: recipeId, user_id: user.id, ...patch },
      { onConflict: 'recipe_id' },
    )
    .select()
    .single();
  if (error) throw new ApiError(error.message, error.code);
  return data as RecipeCanvas;
}
