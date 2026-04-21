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
