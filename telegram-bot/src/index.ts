// Entrypoint — boots the bot + worker in the same Node process. Long
// polling is the default Telegraf transport (no public URL needed). Switch
// to webhooks via Telegraf.webhookCallback when we add a Railway public
// domain in production.

import { createBot } from './bot.js';
import { bootWorker } from './worker.js';

const bot = createBot();
bootWorker(bot);

bot.launch().then(() => {
  console.log('[bot] launched (long polling)');
});

// Graceful shutdown — drain in-flight Telegram requests and close BullMQ
// connections so Railway redeploys don't leave orphan jobs in `processing`.
function shutdown(signal: string): void {
  console.log(`[index] ${signal} received, shutting down`);
  bot.stop(signal);
  // Worker doesn't have an explicit close here — the BullMQ Worker will
  // exit when its Redis connection ends as the process terminates. For
  // graceful drain in production, swap to worker.close().
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
