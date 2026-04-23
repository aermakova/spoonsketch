import { supabase } from './client';
import { ApiError } from './auth';
import type { Cookbook, CookbookInsert } from '../types/cookbook';

export async function fetchCookbooks(): Promise<Cookbook[]> {
  const { data, error } = await supabase
    .from('cookbooks')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new ApiError(error.message, error.code);
  return data as Cookbook[];
}

export type CookbookWithCount = Cookbook & { recipe_count: number };

type CookbookRowWithPages = Cookbook & {
  book_pages: Array<{ page_type: string }> | null;
};

// Cookbooks + recipe_count in one PostgREST query via a left-join on
// book_pages. The client groups counts locally so an empty cookbook still
// appears (with recipe_count: 0).
export async function fetchCookbooksWithCounts(): Promise<CookbookWithCount[]> {
  const { data, error } = await supabase
    .from('cookbooks')
    .select('*, book_pages(page_type)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw new ApiError(error.message, error.code);
  const rows = (data ?? []) as CookbookRowWithPages[];
  return rows.map((c) => {
    const pages = Array.isArray(c.book_pages) ? c.book_pages : [];
    const recipe_count = pages.filter((p) => p.page_type === 'recipe').length;
    const { book_pages: _unused, ...rest } = c;
    return { ...rest, recipe_count };
  });
}

export async function fetchCookbook(id: string): Promise<Cookbook> {
  const { data, error } = await supabase
    .from('cookbooks')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new ApiError(error.message, error.code);
  return data as Cookbook;
}

export async function createCookbook(input: CookbookInsert): Promise<Cookbook> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError('Not authenticated');
  const { data, error } = await supabase
    .from('cookbooks')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw new ApiError(error.message, error.code);
  return data as Cookbook;
}

export async function updateCookbook(id: string, input: Partial<CookbookInsert>): Promise<Cookbook> {
  const { data, error } = await supabase
    .from('cookbooks')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new ApiError(error.message, error.code);
  return data as Cookbook;
}

export async function deleteCookbook(id: string): Promise<void> {
  const { error } = await supabase.from('cookbooks').delete().eq('id', id);
  if (error) throw new ApiError(error.message, error.code);
}
