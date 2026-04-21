import { supabase } from './client';
import { ApiError } from './auth';
import type { Recipe, RecipeInsert } from '../types/recipe';

export async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new ApiError(error.message, error.code);
  return data as Recipe[];
}

export async function fetchRecipe(id: string): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new ApiError(error.message, error.code);
  return data as Recipe;
}

export async function createRecipe(input: RecipeInsert): Promise<Recipe> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError('Not authenticated');

  const { data, error } = await supabase
    .from('recipes')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw new ApiError(error.message, error.code);
  return data as Recipe;
}

export async function updateRecipe(id: string, input: Partial<RecipeInsert>): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new ApiError(error.message, error.code);
  return data as Recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw new ApiError(error.message, error.code);
}

export async function toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .update({ is_favorite: isFavorite })
    .eq('id', id);
  if (error) throw new ApiError(error.message, error.code);
}
