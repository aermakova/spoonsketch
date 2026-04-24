// Telegraf bot — handles incoming messages, auths users, and pushes jobs
// to the queue. The worker (worker.ts) processes jobs and posts replies.

import { Telegraf, type Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from './config.js';
import {
  findConnectionByTelegramId,
  insertTelegramJob,
  supabaseAdmin,
} from './supabase.js';
import { extractQueue, type ExtractJobPayload } from './queue.js';

const RECIPE_URL_RE = /\bhttps?:\/\/[^\s]+/i;
const SCREENSHOTS_BUCKET = 'telegram-screenshots';
// Signed URL TTL — long enough for Haiku to fetch even on a slow worker burst.
const IMAGE_URL_TTL_SECONDS = 60 * 30; // 30 minutes

export function createBot(): Telegraf {
  const bot = new Telegraf(config.telegramBotToken);

  bot.start(async (ctx) => {
    const tgUser = ctx.from;
    if (!tgUser) return;

    // /start with payload = the auth token from the app's Connect Telegram flow.
    const payload = (ctx.startPayload ?? '').trim();
    if (!payload) {
      await ctx.reply(
        `Hi ${tgUser.first_name ?? ''}! To connect this Telegram to your Spoon & Sketch account, open the app → Me → Connect Telegram.`,
      );
      return;
    }

    // Hand the token to telegram-auth Edge Function — it does the work.
    const res = await fetch(`${config.supabaseUrl}/functions/v1/telegram-auth`, {
      method: 'POST',
      headers: {
        'X-Spoon-Bot-Secret': config.botSharedSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: payload,
        telegram_id: tgUser.id,
        username: tgUser.username ?? null,
      }),
    });

    if (res.status === 200) {
      await ctx.reply(`Connected, ${tgUser.username ? '@' + tgUser.username : tgUser.first_name}! Send me a recipe link or a screenshot and I'll save it to your library.`);
    } else if (res.status === 410) {
      await ctx.reply('That code expired — go back to the app and tap Connect Telegram again.');
    } else if (res.status === 409) {
      await ctx.reply('That code was already used. If you need to reconnect, generate a fresh one in the app.');
    } else {
      await ctx.reply("Hmm, couldn't connect that. Try again from the app.");
    }
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      [
        'I save recipes to your Spoon & Sketch library.',
        '',
        'What I accept:',
        '• A link to any recipe page → I extract the recipe.',
        '• A screenshot of a recipe → I read the image.',
        '',
        'I take 5–15 seconds. New recipes appear in your app library automatically.',
      ].join('\n'),
    );
  });

  // Filtered overloads narrow ctx.message to the exact Message subtype, so
  // ctx.message.text / ctx.message.photo are typed without casts.
  bot.on(message('text'), async (ctx) => {
    await handleText(ctx, ctx.message.text);
  });
  bot.on(message('photo'), async (ctx) => {
    await handlePhoto(ctx, ctx.message.photo);
  });

  bot.catch((err, ctx) => {
    console.error('[bot] unhandled error', err, 'update', ctx.update);
  });

  return bot;
}

async function ensureConnected(ctx: Context): Promise<{ userId: string } | null> {
  const tgUser = ctx.from;
  if (!tgUser) return null;
  const conn = await findConnectionByTelegramId(tgUser.id);
  if (!conn) {
    await ctx.reply('Your Telegram isn\'t connected yet. Open Spoon & Sketch → Me → Connect Telegram.').catch(noop);
    return null;
  }
  return { userId: conn.user_id };
}

async function handleText(ctx: Context, text: string): Promise<void> {
  const auth = await ensureConnected(ctx);
  if (!auth) return;

  const match = RECIPE_URL_RE.exec(text);
  if (!match) {
    await ctx.reply("Send a recipe link or a screenshot — I don't know what to do with that.").catch(noop);
    return;
  }
  const url = match[0];

  await ctx.reply('Got it! Extracting your recipe…').catch(noop);

  const tgUser = ctx.from!;
  const jobRowId = await insertTelegramJob({
    user_id: auth.userId,
    telegram_id: tgUser.id,
    input_type: 'url',
    raw_url: url,
    image_storage_path: null,
  });
  if (!jobRowId) {
    await ctx.reply("Couldn't queue that — try again in a moment.").catch(noop);
    return;
  }

  const payload: ExtractJobPayload = {
    kind: 'url',
    userId: auth.userId,
    telegramId: tgUser.id,
    chatId: ctx.chat!.id,
    url,
    jobRowId,
  };
  await extractQueue.add('url-extract', payload);
}

async function handlePhoto(
  ctx: Context,
  photos: ReadonlyArray<{ file_id: string; file_size?: number; width?: number; height?: number }>,
): Promise<void> {
  const auth = await ensureConnected(ctx);
  if (!auth) return;

  if (photos.length === 0) return;

  // Telegram returns multiple resolutions — use the largest.
  const best = photos[photos.length - 1];

  await ctx.reply('Got it! Reading this for you…').catch(noop);

  // Download from Telegram → upload to Supabase Storage → generate signed URL.
  const file = await ctx.telegram.getFile(best.file_id);
  if (!file.file_path) {
    await ctx.reply("Couldn't download that image. Try sending it again.").catch(noop);
    return;
  }
  const fileUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${file.file_path}`;
  const imageRes = await fetch(fileUrl);
  if (!imageRes.ok) {
    await ctx.reply("Couldn't download that image. Try sending it again.").catch(noop);
    return;
  }
  const buffer = new Uint8Array(await imageRes.arrayBuffer());
  if (buffer.byteLength > 5 * 1024 * 1024) {
    await ctx.reply("That image is too large (>5 MB). Try a smaller screenshot.").catch(noop);
    return;
  }

  const tgUser = ctx.from!;
  const filename = `${crypto.randomUUID()}.jpg`;
  const storagePath = `${auth.userId}/${filename}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(SCREENSHOTS_BUCKET)
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: false });
  if (upErr) {
    console.error('[bot] storage upload failed', upErr);
    await ctx.reply("Couldn't save that image. Try again.").catch(noop);
    return;
  }

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(SCREENSHOTS_BUCKET)
    .createSignedUrl(storagePath, IMAGE_URL_TTL_SECONDS);
  if (signErr || !signed) {
    console.error('[bot] signed URL failed', signErr);
    await ctx.reply("Couldn't process that image. Try again.").catch(noop);
    return;
  }

  const jobRowId = await insertTelegramJob({
    user_id: auth.userId,
    telegram_id: tgUser.id,
    input_type: 'screenshot',
    raw_url: null,
    image_storage_path: storagePath,
  });
  if (!jobRowId) {
    await ctx.reply("Couldn't queue that — try again in a moment.").catch(noop);
    return;
  }

  const payload: ExtractJobPayload = {
    kind: 'screenshot',
    userId: auth.userId,
    telegramId: tgUser.id,
    chatId: ctx.chat!.id,
    imageUrl: signed.signedUrl,
    storagePath,
    jobRowId,
  };
  await extractQueue.add('screenshot-extract', payload);
}

function noop(): void { /* swallow telegram send failures (e.g. user blocked the bot) */ }
