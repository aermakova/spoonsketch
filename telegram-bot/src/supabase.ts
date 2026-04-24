// Service-role Supabase client. Bypasses RLS — use carefully and never
// expose to anything that handles user-controlled SQL.

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

export interface TelegramConnectionRow {
  user_id: string;
  telegram_id: number;
  username: string | null;
  connected_at: string;
}

export async function findConnectionByTelegramId(
  telegramId: number,
): Promise<TelegramConnectionRow | null> {
  const { data, error } = await supabaseAdmin
    .from('telegram_connections')
    .select('user_id, telegram_id, username, connected_at')
    .eq('telegram_id', telegramId)
    .maybeSingle<TelegramConnectionRow>();
  if (error) {
    console.error('[supabase] findConnectionByTelegramId failed', error);
    return null;
  }
  return data;
}

export interface TelegramJobRow {
  id: string;
  user_id: string;
  telegram_id: number;
  input_type: 'url' | 'screenshot';
  raw_url: string | null;
  image_storage_path: string | null;
  status: 'queued' | 'processing' | 'done' | 'failed';
  recipe_id: string | null;
  error_message: string | null;
}

export async function insertTelegramJob(
  job: Omit<TelegramJobRow, 'id' | 'recipe_id' | 'error_message' | 'status'> & {
    status?: TelegramJobRow['status'];
  },
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('telegram_jobs')
    .insert({
      user_id: job.user_id,
      telegram_id: job.telegram_id,
      input_type: job.input_type,
      raw_url: job.raw_url,
      image_storage_path: job.image_storage_path,
      status: job.status ?? 'queued',
    })
    .select('id')
    .single();
  if (error) {
    console.error('[supabase] insertTelegramJob failed', error);
    return null;
  }
  return data.id;
}

export async function updateTelegramJob(
  id: string,
  patch: Partial<Pick<TelegramJobRow, 'status' | 'recipe_id' | 'error_message'>>,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('telegram_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('[supabase] updateTelegramJob failed', error);
  }
}

export interface InsertRecipeInput {
  user_id: string;
  title: string;
  description: string | null;
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  ingredients: unknown[];
  instructions: unknown[];
  tags: string[];
  source_url: string | null;
  source_type: 'telegram_link' | 'telegram_screenshot';
}

export async function insertRecipe(input: InsertRecipeInput): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('recipes')
    .insert({
      user_id: input.user_id,
      title: input.title,
      description: input.description,
      servings: input.servings,
      prep_minutes: input.prep_minutes,
      cook_minutes: input.cook_minutes,
      ingredients: input.ingredients,
      instructions: input.instructions,
      tags: input.tags,
      source_url: input.source_url,
      source_type: input.source_type,
    })
    .select('id')
    .single();
  if (error) {
    console.error('[supabase] insertRecipe failed', error);
    return null;
  }
  return data.id;
}
