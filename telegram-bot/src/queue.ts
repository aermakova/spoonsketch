// BullMQ queue + worker scaffolding. Single queue (`recipe-extract`) with
// two job kinds — url and screenshot — discriminated by the payload.
//
// The bot pushes jobs via `extractQueue.add`; the worker (started in
// index.ts) pulls + processes them. Same Redis connection is shared.

import { Queue, Worker, QueueEvents, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config.js';

export const QUEUE_NAME = 'recipe-extract';

// `maxRetriesPerRequest: null` is required by BullMQ — without it ioredis
// will retry on its own and fight BullMQ's queue semantics.
export const redis = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export interface UrlJobPayload {
  kind: 'url';
  userId: string;
  telegramId: number;
  chatId: number;
  url: string;
  jobRowId: string; // telegram_jobs.id
}

export interface ScreenshotJobPayload {
  kind: 'screenshot';
  userId: string;
  telegramId: number;
  chatId: number;
  imageUrl: string;          // signed URL to telegram-screenshots/.../<file>.jpg
  storagePath: string;       // for ai_jobs / telegram_jobs traceability
  jobRowId: string;
}

export type ExtractJobPayload = UrlJobPayload | ScreenshotJobPayload;

export const extractQueue = new Queue<ExtractJobPayload>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 60 * 60 * 24, count: 1000 },  // keep 24h or 1000
    removeOnFail: { age: 60 * 60 * 24 * 7 },               // keep 7d for forensics
  },
});

export const extractQueueEvents = new QueueEvents(QUEUE_NAME, {
  connection: redis,
});

extractQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[queue] job ${jobId} failed:`, failedReason);
});

export type ExtractJobHandler = (job: Job<ExtractJobPayload>) => Promise<void>;

export function startWorker(handler: ExtractJobHandler): Worker<ExtractJobPayload> {
  return new Worker<ExtractJobPayload>(QUEUE_NAME, handler, {
    connection: redis,
    concurrency: 4,         // 4 parallel jobs is plenty for one bot
    lockDuration: 60_000,   // give Haiku up to 60s before stalled-job recovery kicks in
  });
}
