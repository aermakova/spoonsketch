// Phase 8.3 — Client-side helpers for the Connect Telegram flow.
//
// generateTelegramToken inserts a row into telegram_auth_tokens (RLS lets
// the user write their own). The 64-char hex token comes back; the caller
// hands it to the bot via deep link `tg://resolve?domain=<bot>&start=<token>`.
// The bot service then calls the telegram-auth Edge Function (server-side)
// to redeem the token and create the telegram_connections row.

import * as Crypto from 'expo-crypto';
import { supabase } from './client';
import { ApiError } from './auth';

export interface TelegramTokenResult {
  token: string;
  expiresAt: string;
  deepLink: string;       // tg:// link — opens Telegram if installed
  fallbackUrl: string;    // https://t.me/... — works without app installed
}

const BOT_USERNAME = process.env.EXPO_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'spoonsketch_bot';
const TOKEN_TTL_MS = 10 * 60 * 1000;

export async function generateTelegramToken(): Promise<TelegramTokenResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError('Not authenticated');

  // 64 hex chars = 256 bits of entropy. Generated client-side so the user's
  // device is the only place the value exists before being POSTed to PG.
  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error } = await supabase
    .from('telegram_auth_tokens')
    .insert({ user_id: user.id, token, expires_at: expiresAt });

  if (error) throw new ApiError(error.message, error.code);

  return {
    token,
    expiresAt,
    deepLink: `tg://resolve?domain=${BOT_USERNAME}&start=${token}`,
    fallbackUrl: `https://t.me/${BOT_USERNAME}?start=${token}`,
  };
}

export async function disconnectTelegram(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError('Not authenticated');

  const { error } = await supabase
    .from('telegram_connections')
    .delete()
    .eq('user_id', user.id);

  if (error) throw new ApiError(error.message, error.code);
}

export interface TelegramConnection {
  user_id: string;
  telegram_id: number;
  username: string | null;
  connected_at: string;
}

export async function fetchTelegramConnection(): Promise<TelegramConnection | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('telegram_connections')
    .select('user_id, telegram_id, username, connected_at')
    .eq('user_id', user.id)
    .maybeSingle<TelegramConnection>();

  if (error) throw new ApiError(error.message, error.code);
  return data;
}

// React Native's Hermes runtime doesn't expose Web Crypto by default, so
// we use expo-crypto's polyfilled getRandomBytes.
function randomHex(byteLength: number): string {
  const bytes = Crypto.getRandomBytes(byteLength);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}
