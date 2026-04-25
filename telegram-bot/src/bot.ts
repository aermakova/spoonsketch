// Telegraf bot — handles incoming messages, auths users, and pushes jobs
// to the queue. The worker (worker.ts) processes jobs and posts replies.

import { Telegraf, type Context } from 'telegraf';
import type { Telegram } from 'telegraf';
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

// Album handling: when a user shares multiple photos as one Telegram album
// each arrives as its own message with a shared `media_group_id`. We buffer
// them in-memory and process the batch once `ALBUM_DEBOUNCE_MS` elapses
// without a new arrival. Capped at `MAX_PHOTOS_PER_ALBUM` to bound cost.
const ALBUM_DEBOUNCE_MS = 1500;
const MAX_PHOTOS_PER_ALBUM = 10;

interface PhotoRef {
  file_id: string;
  file_size?: number;
  width?: number;
  height?: number;
}

interface AlbumBuffer {
  photos: PhotoRef[];
  caption?: string;
  chatId: number;
  tgUser: NonNullable<Context['from']>;
  oversized: boolean; // user sent >MAX_PHOTOS_PER_ALBUM; warn at process time
  timer: NodeJS.Timeout;
}

const albumBuffers = new Map<string, AlbumBuffer>();

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
    // Function is deployed with verify_jwt=false; auth is via X-Spoon-Bot-Secret.
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
    const tgUser = ctx.from;
    const chatId = ctx.chat?.id;
    if (!tgUser || chatId === undefined) return;

    // PhotoMessage exposes media_group_id but the narrowed type doesn't
    // surface it cleanly across Telegraf versions — read it via a typed cast.
    const mgid = (ctx.message as { media_group_id?: string }).media_group_id;
    const caption = (ctx.message as { caption?: string }).caption;
    const largest = ctx.message.photo[ctx.message.photo.length - 1];
    if (!largest) return;

    if (!mgid) {
      // Single photo — process immediately, no buffering.
      await processPhotoBatch(bot.telegram, chatId, tgUser, [largest], caption, false);
      return;
    }

    // Album path: accumulate, debounce, fire once when all photos have landed.
    const existing = albumBuffers.get(mgid);
    if (existing) clearTimeout(existing.timer);
    const buffer: AlbumBuffer = existing ?? {
      photos: [],
      caption,
      chatId,
      tgUser,
      oversized: false,
      timer: setTimeout(noop, 0), // placeholder, replaced below
    };
    if (!buffer.caption && caption) buffer.caption = caption;
    if (buffer.photos.length < MAX_PHOTOS_PER_ALBUM) {
      buffer.photos.push(largest);
    } else {
      buffer.oversized = true;
    }
    buffer.timer = setTimeout(() => {
      albumBuffers.delete(mgid);
      void processPhotoBatch(
        bot.telegram,
        buffer.chatId,
        buffer.tgUser,
        buffer.photos,
        buffer.caption,
        buffer.oversized,
      );
    }, ALBUM_DEBOUNCE_MS);
    albumBuffers.set(mgid, buffer);
  });

  bot.catch((err, ctx) => {
    console.error('[bot] unhandled error', err, 'update', ctx.update);
  });

  return bot;
}

async function ensureConnected(ctx: Context): Promise<{ userId: string } | null> {
  const tgUser = ctx.from;
  const chatId = ctx.chat?.id;
  if (!tgUser || chatId === undefined) return null;
  return ensureConnectedFor(ctx.telegram, chatId, tgUser);
}

async function ensureConnectedFor(
  telegram: Telegram,
  chatId: number,
  tgUser: NonNullable<Context['from']>,
): Promise<{ userId: string } | null> {
  const conn = await findConnectionByTelegramId(tgUser.id);
  if (!conn) {
    await telegram
      .sendMessage(chatId, "Your Telegram isn't connected yet. Open Spoon & Sketch → Me → Connect Telegram.")
      .catch(noop);
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

async function processPhotoBatch(
  telegram: Telegram,
  chatId: number,
  tgUser: NonNullable<Context['from']>,
  photos: PhotoRef[],
  caption: string | undefined,
  oversized: boolean,
): Promise<void> {
  if (photos.length === 0) return;

  const auth = await ensureConnectedFor(telegram, chatId, tgUser);
  if (!auth) return;

  const reply =
    photos.length === 1
      ? 'Got it! Reading this for you…'
      : `Got ${photos.length} photos! Reading them as one recipe…`;
  await telegram.sendMessage(chatId, reply).catch(noop);
  if (oversized) {
    await telegram
      .sendMessage(
        chatId,
        `I can only read up to ${MAX_PHOTOS_PER_ALBUM} photos at once — send the rest separately.`,
      )
      .catch(noop);
  }

  // Upload every photo serially (small N, simpler error handling).
  const storagePaths: string[] = [];
  const imageUrls: string[] = [];
  for (const photo of photos) {
    const uploaded = await uploadOnePhoto(telegram, chatId, auth.userId, photo);
    if (!uploaded) return; // user already got an error reply
    storagePaths.push(uploaded.storagePath);
    imageUrls.push(uploaded.signedUrl);
  }

  // One telegram_jobs row per album. recipe_id stays null until extraction
  // completes; image_storage_path tracks the FIRST photo as a best-effort
  // observability hook (full list lives in the queue payload).
  const jobRowId = await insertTelegramJob({
    user_id: auth.userId,
    telegram_id: tgUser.id,
    input_type: 'screenshot',
    raw_url: null,
    image_storage_path: storagePaths[0] ?? null,
  });
  if (!jobRowId) {
    await telegram.sendMessage(chatId, "Couldn't queue that — try again in a moment.").catch(noop);
    return;
  }

  const payload: ExtractJobPayload = {
    kind: 'screenshot',
    userId: auth.userId,
    telegramId: tgUser.id,
    chatId,
    imageUrls,
    storagePaths,
    caption,
    jobRowId,
  };
  await extractQueue.add('screenshot-extract', payload);
}

async function uploadOnePhoto(
  telegram: Telegram,
  chatId: number,
  userId: string,
  photo: PhotoRef,
): Promise<{ storagePath: string; signedUrl: string } | null> {
  const file = await telegram.getFile(photo.file_id);
  if (!file.file_path) {
    await telegram.sendMessage(chatId, "Couldn't download that image. Try sending it again.").catch(noop);
    return null;
  }
  const fileUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${file.file_path}`;
  const imageRes = await fetch(fileUrl);
  if (!imageRes.ok) {
    await telegram.sendMessage(chatId, "Couldn't download that image. Try sending it again.").catch(noop);
    return null;
  }
  const buffer = new Uint8Array(await imageRes.arrayBuffer());
  if (buffer.byteLength > 5 * 1024 * 1024) {
    await telegram.sendMessage(chatId, 'That image is too large (>5 MB). Try a smaller screenshot.').catch(noop);
    return null;
  }

  const filename = `${crypto.randomUUID()}.jpg`;
  const storagePath = `${userId}/${filename}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(SCREENSHOTS_BUCKET)
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: false });
  if (upErr) {
    console.error('[bot] storage upload failed', upErr);
    await telegram.sendMessage(chatId, "Couldn't save that image. Try again.").catch(noop);
    return null;
  }

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(SCREENSHOTS_BUCKET)
    .createSignedUrl(storagePath, IMAGE_URL_TTL_SECONDS);
  if (signErr || !signed) {
    console.error('[bot] signed URL failed', signErr);
    await telegram.sendMessage(chatId, "Couldn't process that image. Try again.").catch(noop);
    return null;
  }

  return { storagePath, signedUrl: signed.signedUrl };
}

function noop(): void { /* swallow telegram send failures (e.g. user blocked the bot) */ }
