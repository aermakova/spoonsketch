import { supabase } from './client';
import { ApiError } from './auth';
import type { BookPage, BookPageInsert } from '../types/cookbook';

export async function fetchBookPages(cookbookId: string): Promise<BookPage[]> {
  const { data, error } = await supabase
    .from('book_pages')
    .select('*, recipes(title)')
    .eq('cookbook_id', cookbookId)
    .order('position', { ascending: true });
  if (error) throw new ApiError(error.message, error.code);
  return (data as any[]).map(row => ({
    ...row,
    recipe_title: (row.recipes as { title: string } | null)?.title ?? null,
    recipes: undefined,
  })) as BookPage[];
}

export async function addBookPage(input: BookPageInsert): Promise<BookPage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError('Not authenticated');
  const { data, error } = await supabase
    .from('book_pages')
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw new ApiError(error.message, error.code);
  return data as BookPage;
}

export async function deleteBookPage(id: string): Promise<void> {
  const { error } = await supabase.from('book_pages').delete().eq('id', id);
  if (error) throw new ApiError(error.message, error.code);
}

export async function reorderBookPages(
  pages: Array<{ id: string; position: number }>,
): Promise<void> {
  await Promise.all(
    pages.map(async ({ id, position }) => {
      const { error } = await supabase
        .from('book_pages')
        .update({ position })
        .eq('id', id);
      if (error) throw new ApiError(error.message, error.code);
    }),
  );
}

export async function updateBookPage(
  id: string,
  input: { title?: string | null; template_key?: string | null },
): Promise<BookPage> {
  const { data, error } = await supabase
    .from('book_pages')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new ApiError(error.message, error.code);
  return data as BookPage;
}
