import { supabase } from './client';
import { ApiError } from './auth';
import type { Recipe, RecipeInsert, Ingredient } from '../types/recipe';

// AI-extracted recipes (Telegram bot, URL import) get their ingredient ids
// assigned in the extract-recipe Edge Function, but pre-fix rows in the DB
// don't have them. Normalize on read so old rows render and edit cleanly.
// Cheap to do unconditionally — for rows with ids it's a no-op clone.
function normalizeIngredients(ings: unknown): Ingredient[] {
  if (!Array.isArray(ings)) return [];
  return ings.map((raw) => {
    const ing = raw as Partial<Ingredient> & Record<string, unknown>;
    return {
      id: typeof ing.id === 'string' && ing.id.length > 0
        ? ing.id
        : (globalThis.crypto?.randomUUID?.() ?? `ing-${Math.random().toString(36).slice(2, 9)}`),
      name: typeof ing.name === 'string' ? ing.name : '',
      amount: typeof ing.amount === 'string' ? ing.amount : '',
      unit: typeof ing.unit === 'string' ? ing.unit : '',
      group: typeof ing.group === 'string' ? ing.group : null,
    };
  });
}

function normalizeRecipe(row: Recipe): Recipe {
  return { ...row, ingredients: normalizeIngredients(row.ingredients) };
}

export async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new ApiError(error.message, error.code);
  return (data as Recipe[]).map(normalizeRecipe);
}

export async function fetchRecipe(id: string): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new ApiError(error.message, error.code);
  return normalizeRecipe(data as Recipe);
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
