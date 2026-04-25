// BullMQ queue + worker scaffolding with an in-process fallback.
//
// When REDIS_URL is set (production / Upstash-backed dev), the BullMQ
// path runs: jobs survive restarts, parallel workers, exponential retries.
//
// When REDIS_URL is unset (bring-up / demo on your laptop), the fallback
// path runs: jobs are processed inline in the same Node process. Simpler
// to get started (no external service), but:
//   - jobs lost on crash / restart
//   - no retry, no backoff
//   - single-worker concurrency only
//   - no BullMQ dashboard / observability
//
// TODO(redis-prod): wire the Upstash Redis URL before production. See
// `telegram-bot/README.md` §"Switch to Redis-backed queue" for the 3-line
// env-var change and why it matters.

import { config } from './config.js';

export interface UrlJobPayload {
  kind: 'url';
  userId: string;
  telegramId: number;
  chatId: number;
  url: string;
  jobRowId: string;
}

export interface ScreenshotJobPayload {
  kind: 'screenshot';
  userId: string;
  telegramId: number;
  chatId: number;
  // One or more sequential screenshots of the same recipe. Single-photo
  // messages produce a 1-element array; Telegram albums (media_group)
  // produce N. Capped at 10 in the upload step.
  imageUrls: string[];
  storagePaths: string[];
  // Optional caption from the album's first photo. Passed to Haiku as
  // user-provided context to disambiguate ambiguous screenshots.
  caption?: string;
  jobRowId: string;
}

export type ExtractJobPayload = UrlJobPayload | ScreenshotJobPayload;

export type ExtractJobHandler = (payload: ExtractJobPayload) => Promise<void>;

export interface ExtractQueue {
  add: (name: string, payload: ExtractJobPayload) => Promise<void>;
  startWorker: (handler: ExtractJobHandler) => Promise<void> | void;
  close: () => Promise<void>;
}

const USING_REDIS = !!config.redisUrl;

export const extractQueue: ExtractQueue = USING_REDIS
  ? await buildRedisQueue()
  : buildInProcessQueue();

// ─── Redis-backed (production) ──────────────────────────────────────────────

async function buildRedisQueue(): Promise<ExtractQueue> {
  const { Queue, Worker, QueueEvents } = await import('bullmq');
  const { default: IORedis } = await import('ioredis');

  const redis = new IORedis(config.redisUrl!, { maxRetriesPerRequest: null });

  const queue = new Queue<ExtractJobPayload>('recipe-extract', {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
      removeOnFail: { age: 60 * 60 * 24 * 7 },
    },
  });

  const events = new QueueEvents('recipe-extract', { connection: redis });
  events.on('failed', ({ jobId, failedReason }) => {
    console.error(`[queue] job ${jobId} failed:`, failedReason);
  });

  let worker: InstanceType<typeof Worker> | null = null;

  return {
    async add(name: string, payload: ExtractJobPayload) {
      await queue.add(name, payload);
    },
    startWorker(handler: ExtractJobHandler) {
      worker = new Worker<ExtractJobPayload>(
        'recipe-extract',
        async (job) => { await handler(job.data); },
        { connection: redis, concurrency: 4, lockDuration: 60_000 },
      );
      console.log('[queue] Redis-backed worker ready');
    },
    async close() {
      await worker?.close();
      await queue.close();
      await events.close();
      await redis.quit();
    },
  };
}

// ─── In-process fallback (dev / no-Redis mode) ─────────────────────────────

function buildInProcessQueue(): ExtractQueue {
  console.warn(
    '[queue] ⚠️  REDIS_URL not set — running in no-queue fallback mode. ' +
    'Jobs process inline, are lost on crash, no retries. ' +
    'Fine for local testing; NOT for production. ' +
    'See telegram-bot/README.md §"Switch to Redis-backed queue".',
  );

  const pending: Array<{ payload: ExtractJobPayload }> = [];
  let handler: ExtractJobHandler | null = null;
  let draining = false;

  async function drain(): Promise<void> {
    if (draining || !handler) return;
    draining = true;
    try {
      while (pending.length > 0) {
        const next = pending.shift()!;
        try {
          await handler(next.payload);
        } catch (err) {
          console.error('[queue] in-process job failed:', err);
        }
      }
    } finally {
      draining = false;
    }
  }

  return {
    async add(_name: string, payload: ExtractJobPayload) {
      pending.push({ payload });
      // Fire-and-forget — add returns immediately, the handler runs later.
      setImmediate(() => { void drain(); });
    },
    startWorker(h: ExtractJobHandler) {
      handler = h;
      void drain(); // process anything enqueued before worker registered
      console.log('[queue] in-process worker ready (no Redis)');
    },
    async close() { /* nothing to close */ },
  };
}
