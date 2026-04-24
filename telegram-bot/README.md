# Spoon & Sketch — Telegram bot

Receives recipe URLs and screenshots from users on Telegram, extracts the recipe via the `extract-recipe` Edge Function, writes it to the user's Supabase library, and replies with a deep link back to the app.

Deploys to Railway as a Node 20 service. Uses [Telegraf](https://telegraf.js.org/) for Telegram polling, [BullMQ](https://docs.bullmq.io/) on Upstash Redis for the job queue.

## Architecture

```
Telegram chat
  ↓ (long polling)
bot.ts  →  telegram_jobs INSERT  →  extractQueue.add(...)  →  Worker (worker.ts)
                                                                    ↓
                                                       fetch /functions/v1/extract-recipe
                                                       (X-Spoon-Bot-Secret + user_id in body)
                                                                    ↓
                                                          recipes INSERT
                                                                    ↓
                                                       bot.telegram.sendMessage(...)
```

The bot itself is the Telegraf process. The worker runs in the same Node process — separate Redis connection, but shared with the bot's queue producer.

## Local dev

1. Copy `.env.example` to `.env` and fill in:
   - `TELEGRAM_BOT_TOKEN` — from BotFather (@BotFather → /mybots → Bot → API Token)
   - `TELEGRAM_BOT_SHARED_SECRET` — must match the value set on Supabase via `supabase secrets set TELEGRAM_BOT_SHARED_SECRET=...`
   - `SUPABASE_URL` — `https://<project-ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` — Dashboard → Project Settings → API → `service_role` key
   - `REDIS_URL` — Upstash Redis connection string (`rediss://default:…@us1-xxx.upstash.io:6379`)
2. Install + run:
   ```bash
   npm install
   npm run dev    # tsx watch — restarts on save
   ```
3. Open Telegram, send any message to your bot. With no Spoon & Sketch account connected, you'll get the onboarding reply pointing you to the app.
4. In the app: Me tab → Connect Telegram → it opens the bot with `/start <token>` → reply: "Connected, @your_handle!"
5. Send a recipe URL or screenshot → 5–15s later you get "Saved!" with a deep link.

## Deploy to Railway

1. Push the repo to GitHub if not already.
2. Railway → New Project → Deploy from GitHub → select the spoonsketch repo.
3. Railway autodetects Node and the `railway.json` build/start commands.
4. Set **Root Directory** to `telegram-bot` (Railway service settings).
5. Add the env vars from `.env.example` in the Railway dashboard (Variables tab).
6. Deploy. Tail logs to confirm `[bot] launched (long polling)` and `[worker] ready`.

Long polling means the bot doesn't need a public URL — perfect for Railway's default deploy. If you scale beyond 1 replica or want sub-second latency, switch to webhooks (Telegraf's `webhookCallback`) and configure a Railway custom domain.

## Cost

| Service | Monthly cost |
|---|---|
| Railway Hobby | $5 |
| Upstash Redis (free tier) | $0 |
| Supabase Storage (telegram-screenshots bucket) | included in your plan |
| Anthropic Haiku | counts against existing per-user quotas |

Total incremental: **~$5/month**.

## Operational notes

- **Bot polling vs webhooks**: defaults to polling. Switch to webhooks when scaling — better for low-latency replies with multiple replicas.
- **Worker concurrency**: 4 jobs in parallel. Bump if Redis CPU stays low and Anthropic isn't rate-limiting.
- **Job retries**: 2 attempts, 5s exponential backoff. Failures land in BullMQ's `failed` set (kept 7 days for forensics).
- **Service-role key**: lives only in Railway env vars. Never commit, never expose in the iOS bundle. The `.env.example` is checked in but is just placeholders.
- **Redis stalled jobs**: if the worker crashes mid-job, BullMQ's `stalledInterval` (default 30s) re-claims it. The 60s lockDuration in `queue.ts` matches Anthropic's slowest realistic response.

## Files

| Path | Role |
|---|---|
| `src/index.ts` | Entrypoint — boots bot + worker. |
| `src/bot.ts` | Telegraf handlers (`/start`, `/help`, text, photo). |
| `src/worker.ts` | BullMQ worker — processes jobs, calls Edge Function, posts replies. |
| `src/queue.ts` | BullMQ Queue + Worker setup, Redis connection. |
| `src/extract.ts` | HTTP client for the extract-recipe Edge Function (bot-mode auth). |
| `src/supabase.ts` | Service-role Supabase client + DB helpers. |
| `src/config.ts` | Env validation, fail-fast at boot. |
| `railway.json` | Railway build/start config. |
| `.env.example` | Env var template. |
