// BullMQ worker — pulls jobs off the recipe-extract queue, calls the
// extract-recipe Edge Function, writes the resulting recipe to the DB,
// then posts a reply back to Telegram.
//
// Started once from index.ts after the bot itself is up.

import type { Job } from 'bullmq';
import type { Telegraf } from 'telegraf';
import { callExtractRecipe, type ExtractedRecipe } from './extract.js';
import {
  insertRecipe,
  updateTelegramJob,
  type InsertRecipeInput,
} from './supabase.js';
import {
  startWorker,
  type ExtractJobPayload,
} from './queue.js';
import { config } from './config.js';

export function bootWorker(bot: Telegraf): void {
  startWorker(async (job: Job<ExtractJobPayload>) => {
    const payload = job.data;
    const { jobRowId, userId, chatId } = payload;

    await updateTelegramJob(jobRowId, { status: 'processing' });

    const extractResult = payload.kind === 'url'
      ? await callExtractRecipe({ userId, url: payload.url })
      : await callExtractRecipe({ userId, imageUrl: payload.imageUrl });

    if (!extractResult.ok) {
      const friendly = friendlyError(extractResult.errorCode, extractResult.status);
      await updateTelegramJob(jobRowId, {
        status: 'failed',
        error_message: `${extractResult.errorCode}: ${extractResult.message ?? ''}`,
      });
      await bot.telegram.sendMessage(chatId, friendly).catch(noop);
      return;
    }

    const recipe = extractResult.recipe;

    // Partial extraction: still create a recipe row with whatever Haiku
    // gave us, but tell the user it's incomplete and to fix it in-app.
    const sourceType = payload.kind === 'url' ? 'telegram_link' : 'telegram_screenshot';
    const insertInput: InsertRecipeInput = {
      user_id: userId,
      title: recipe.title || 'Untitled Recipe',
      description: recipe.description ?? null,
      servings: recipe.servings ?? null,
      prep_minutes: recipe.prep_minutes ?? null,
      cook_minutes: recipe.cook_minutes ?? null,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      tags: Array.isArray(recipe.tags) ? recipe.tags.slice(0, 5) : [],
      source_url: payload.kind === 'url' ? payload.url : null,
      source_type: sourceType,
    };

    const recipeId = await insertRecipe(insertInput);
    if (!recipeId) {
      await updateTelegramJob(jobRowId, {
        status: 'failed',
        error_message: 'recipe_insert_failed',
      });
      await bot.telegram
        .sendMessage(chatId, "Saved your message but couldn't write the recipe — try again in a sec.")
        .catch(noop);
      return;
    }

    await updateTelegramJob(jobRowId, {
      status: 'done',
      recipe_id: recipeId,
    });

    const deepLink = `${config.appDeeplinkBase}recipe/${recipeId}`;
    const successCopy = recipe.partial
      ? successPartialMessage(recipe, deepLink)
      : successFullMessage(recipe, deepLink);

    await bot.telegram
      .sendMessage(chatId, successCopy, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } })
      .catch(noop);
  });
  console.log('[worker] ready');
}

function successFullMessage(recipe: ExtractedRecipe, deepLink: string): string {
  return `Saved! *${escapeMd(recipe.title)}*\n[Open in ${escapeMd(config.appName)} →](${deepLink})`;
}

function successPartialMessage(recipe: ExtractedRecipe, deepLink: string): string {
  return `Got a partial read — open in app to fill in the rest.\n*${escapeMd(recipe.title || 'Untitled Recipe')}*\n[Open in ${escapeMd(config.appName)} →](${deepLink})`;
}

function friendlyError(code: string, status: number): string {
  switch (code) {
    case 'monthly_limit_reached':
      return "You've hit your monthly Telegram extraction limit — open the app to upgrade to Premium.";
    case 'rate_limited':
      return "A little fast — wait a moment and try again.";
    case 'invalid_url':
      return "That doesn't look like a recipe link I can read.";
    case 'invalid_image_url':
      return "I couldn't read that image. Try a clearer screenshot.";
    case 'ai_unavailable':
      return "AI is taking a breather — try again in a minute.";
    case 'user_not_found':
      return "Your Telegram isn't connected to a Spoon & Sketch account. Open the app → Me → Connect Telegram.";
    default:
      return status >= 500
        ? "Something broke on our end — try again."
        : "Couldn't extract that one. Try a different recipe?";
  }
}

function escapeMd(s: string): string {
  // Telegram Markdown V1 escape — only needs * _ [ ] backtick handled.
  return s.replace(/([_*[\]`])/g, '\\$1');
}

function noop(): void { /* swallow Telegram send errors */ }
