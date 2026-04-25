// Centralised env validation. Fail fast at boot if any required var is
// missing — better than discovering it on the first user message.

// Loads telegram-bot/.env in dev. No-ops on Railway where env vars come
// from the platform's UI rather than a file on disk.
import 'dotenv/config';

interface Config {
  telegramBotToken: string;
  botSharedSecret: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  // Optional — when unset, the bot runs in no-queue fallback mode. TODO
  // (redis-prod): set this on Railway/locally to enable BullMQ retries +
  // crash recovery. See telegram-bot/README.md §"Switch to Redis-backed
  // queue" for the 3-line change.
  redisUrl: string | undefined;
  extractRecipeFunctionUrl: string;
  // Optional — defaults to spoonsketch:// scheme; set APP_DEEPLINK_BASE on
  // Railway if the iOS deep link host needs to differ.
  appDeeplinkBase: string;
  // Optional — used in the bot's reply markdown to label the "Open in app"
  // link. Cosmetic only.
  appName: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config: Config = {
  telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
  botSharedSecret: required('TELEGRAM_BOT_SHARED_SECRET'),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  redisUrl: process.env.REDIS_URL || undefined,
  extractRecipeFunctionUrl: process.env.EXTRACT_RECIPE_FUNCTION_URL
    ?? `${required('SUPABASE_URL').replace(/\/$/, '')}/functions/v1/extract-recipe`,
  appDeeplinkBase: process.env.APP_DEEPLINK_BASE ?? 'spoonsketch://',
  appName: process.env.APP_NAME ?? 'Spoon & Sketch',
};
