# Plan — Phase 8: Telegram bot ("send recipe to @SpoonAndSketchBot")

**Owner:** Angy
**Target phase (master tracker):** Phase 8 — "Telegram bot"
**Depends on:** Phase 7 (shares `extract-recipe` + `ai_jobs` + Haiku infra)
**Status:** ⏳ Not started (plan drafted 2026-04-22)

## Goal

Turn Telegram into the frictionless recipe-capture channel for Spoon & Sketch.

User flow the app must enable:

> User is browsing recipes on their phone, copies a URL or screenshots a page → opens chat with `@SpoonAndSketchBot` → pastes / drops the image → 5–15 seconds later, a recipe appears in their Library on the app, no tapping back and forth.

Within the app, user flow:

> Me tab → "Connect Telegram" → tap "Open in Telegram" → bot opens pre-filled with a `/start <token>` command → user taps Start → bot replies "Connected, @username!" → back to app, shows "✓ Connected as @username".

## North-star acceptance

From master tracker: *"Send link to bot → recipe appears in app within 30s."*

Plus:
- First-time connect flow works end-to-end without the user ever leaving their phone.
- Links and photo messages both work.
- The bot ignores unknown users with a one-line hint to connect.
- App library updates in near-real-time (≤5s) once the bot writes the recipe — no manual refresh needed.
- Free-tier caps (20 url_extract + 20 image_extract / month) are enforced server-side, same counters as Phase 7's in-app import.
- Errors in the Haiku pipeline surface as a friendly bot reply, not silence.

## What's in / out of scope

| ✅ In this plan | ⏸ Deferred |
|---|---|
| `@SpoonAndSketchBot` Telegram bot (Telegraf on Railway) | WhatsApp bot (separate plan — see footer) |
| Single-user bot auth via one-time token | Group chat support |
| Text messages with URLs → url_extract pipeline | Voice messages, video, forwarded messages |
| Photo messages → image_extract pipeline | Multi-photo album handling (just use first photo) |
| BullMQ + Upstash Redis for queue | Running the worker in-process (no separate Railway service) |
| `telegram-auth` Edge Function | Settings to rename / change the connected Telegram account (unlink + reconnect is enough) |
| "Connect Telegram" UI in the Me tab | `/help`, `/start` customisation beyond the auth token |
| Supabase Realtime subscription for recipes | Full offline-first; connection loss during bot extraction is handled by polling on reconnect |
| Deep link back to app on reply message | Inline bot buttons beyond "Open in App →" |
| Free-tier caps shared with in-app import | Per-chat rate limits beyond existing 10s-per-function guard |
| Docs + device scenarios | Admin dashboard for `telegram_jobs` observability |

## Current state (2026-04-22)

- `telegram_connections` + `telegram_jobs` tables already exist in the schema (see BACKEND.md §1 Entity map). No migration needed.
- `ai_jobs.job_type` already has `'image_extract'` as a valid value.
- `extract-recipe` Edge Function handles `{ url }`. It does **not** yet handle `{ image_url }` — Phase 8.1 extends it.
- There's no `supabase/functions/telegram-auth/` yet.
- There's no `telegram-bot/` directory yet. Phase 8 creates a new Node.js service in this repo under `telegram-bot/` (simpler than a separate repo for MVP).
- The client has no "Connect Telegram" UI. Me tab is still a placeholder.
- `@SpoonAndSketchBot` does not yet exist on Telegram (needs BotFather setup).

## Sub-phase breakdown

Six commits — each independently shippable. 8.0 → 8.4 are the critical path; 8.5 is polish.

### 8.0 — DB audit + `image_extract` flow in `extract-recipe`

**Goal:** extend Phase 7's Edge Function to accept an image URL, so the bot's screenshot path reuses the same pipeline.

Server:
- `supabase/functions/extract-recipe/index.ts` — accept `{ image_url }` as an alternative to `{ url }`. Validate `image_url` points to a Supabase Storage URL (or any https:// host; but restrict to our Storage for cost control).
- When image mode: skip the scrape step; pass the image directly to Haiku as an `image` content block (`{ type: 'image', source: { type: 'url', url } }`). Same system prompt, same JSON response shape.
- Log `ai_jobs` row with `job_type = 'image_extract'`.
- Quota check reads `image_extract` row counts — **but** bot users share the Phase 7 quota logic (server-enforced, no client involved here).

Storage:
- Ensure `telegram-screenshots/` bucket exists (private, Edge Function access only). Quick migration if missing.
- Signed-URL generation helper on the Edge Function side so Haiku can actually fetch the image.

Client: no change in 8.0 — this is pure server scaffolding.

Docs: BACKEND.md cross-ref update.

**Acceptance:**
- `curl -X POST extract-recipe` with `{ "image_url": "<signed supabase url>" }` returns 200 with a recipe JSON.
- Existing URL path still works identically (regression).
- `ai_jobs` rows for image calls have `job_type = 'image_extract'`.

One commit. ~2 hours.

---

### 8.1 — `telegram-auth` Edge Function + one-time token registry

**Goal:** secure, single-use tokens the bot can trade for a `telegram_connections` row.

Data model (add in a new migration):
```sql
create table public.telegram_auth_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  token       text unique not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,        -- now() + 10 minutes
  consumed_at timestamptz                  -- null until redeemed
);
create index on public.telegram_auth_tokens(token);
create index on public.telegram_auth_tokens(user_id);
```

Server:
- `supabase/functions/telegram-auth/index.ts` — **internal** endpoint (not JWT-authed like other functions). Verifies an `X-Spoon-Bot-Secret` header against `TELEGRAM_BOT_SHARED_SECRET` env var. Body: `{ token, telegram_id, username? }`. Looks up the token; if valid + not expired + not consumed, inserts a `telegram_connections` row (or updates if user already has one), marks the token `consumed_at`, returns `{ connected: true, user_id }`.
- Client-side (app): a new `src/api/telegramAuth.ts` with `generateTelegramToken()` that inserts a row and returns the token + bot deep-link URL.

Secret setup: `TELEGRAM_BOT_SHARED_SECRET` set on both Supabase (for the function) and Railway (for the bot).

**Acceptance:**
- Calling `POST /functions/v1/telegram-auth` without the bot secret → 401.
- Calling with the secret + a valid token + a telegram_id → 200, `telegram_connections` row exists, `telegram_auth_tokens.consumed_at` filled.
- Second call with the same token → 409 `token_already_used`.
- Token older than 10 minutes → 410 `token_expired`.

One commit. ~2 hours including the migration + `supabase gen types` run.

---

### 8.2 — Telegram bot service on Railway (Telegraf + BullMQ + worker)

**Goal:** standalone Node.js service that listens to Telegram, auths users, and dispatches jobs.

New directory `telegram-bot/` at repo root — a separate Node package so Railway can build it independently.

```
telegram-bot/
├── package.json         # telegraf, bullmq, ioredis, @anthropic-ai/sdk (if needed), @supabase/supabase-js
├── tsconfig.json
├── railway.json         # buildCommand, startCommand
├── Dockerfile           # optional — only if Railway's Nixpacks has issues
└── src/
    ├── index.ts         # entrypoint; boots bot + worker in same process
    ├── bot.ts           # Telegraf setup, handlers
    ├── worker.ts        # BullMQ worker pulling from `recipe-extract` queue
    ├── supabase.ts      # service-role client
    ├── extract.ts       # wrapper around extract-recipe Edge Function (+ bot-shared secret)
    └── config.ts        # env validation
```

Env vars (Railway):
- `TELEGRAM_BOT_TOKEN` — from @BotFather
- `TELEGRAM_BOT_SHARED_SECRET` — same as Supabase
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL` — from Upstash (use their Redis add-on or a free-tier Upstash account directly)
- `APP_DEEPLINK_BASE` — `spoonsketch://` (or an https bridge URL if needed)
- `EXTRACT_RECIPE_FUNCTION_URL` — `https://<project-ref>.supabase.co/functions/v1/extract-recipe`

Bot handlers:
- `bot.start(async ctx => ...)` — handles `/start [token]`. If token present: call `telegram-auth` function; reply with success or error. If no token: reply with "Open Spoon & Sketch → Me → Connect Telegram to get a code."
- `bot.on('text', ...)` — auth check; URL pattern match; enqueue `{ kind: 'url', userId, chatId, url }`; reply "Got it! Extracting your recipe…".
- `bot.on('photo', ...)` — auth check; download largest-size photo to Supabase Storage `telegram-screenshots/{userId}/{jobId}.jpg`; enqueue `{ kind: 'screenshot', userId, chatId, storagePath }`; reply "Got it! Reading this for you…".
- Unknown user: single-line onboarding reply.

Worker loop:
- Pulls jobs from `recipe-extract` queue.
- Writes `telegram_jobs` row (status `processing`).
- Calls `extract-recipe` with the appropriate body (`url` or signed `image_url` for the Storage file).
- On success: insert a `recipes` row via service-role client (source_type = `telegram_link` or `telegram_screenshot`); update `telegram_jobs` with `recipe_id`, status `done`; reply to chat with "Saved! *{title}* — [Open in app →](spoonsketch://recipe/{id})".
- On failure: update `telegram_jobs` with error_message, status `failed`; reply with a friendly one-liner.

Queue hardening:
- Job attempts: 2, backoff 5s.
- Failed jobs land in `recipe-extract-failed` (BullMQ default). Manually drain as needed; no alerting in v1.

Railway config:
- Health check: GET `/health` returns 200 with redis + bot-polling status.
- Restart policy: on-failure.

**Acceptance:**
- `git push` triggers a Railway deploy; logs show "Bot started" + "Worker ready".
- Send a URL to the bot from a connected Telegram account → recipe appears in the DB within 30s.
- Send a photo → recipe appears in the DB within 45s.
- Disconnect Redis → worker reconnects on its own; jobs sent during downtime retry.

One commit. ~1 full day.

---

### 8.3 — "Connect Telegram" UI in the Me tab

**Goal:** user can generate + use a token without leaving the phone.

Client:
- `app/(tabs)/me.tsx` — replace placeholder. Renders:
  - Current connection state via a `useTelegramConnection()` hook that queries `telegram_connections` for the current user.
  - If not connected: **Connect Telegram** ClayButton. Tapping it:
    1. Generates a row in `telegram_auth_tokens` via PostgREST.
    2. Opens `tg://resolve?domain=SpoonAndSketchBot&start=<token>` via Linking.openURL. Fallback: show the `https://t.me/SpoonAndSketchBot?start=<token>` URL + a copy-to-clipboard button for devices without Telegram installed.
  - If connected: shows "✓ Connected as @username · last synced <relative time>" + **Disconnect** button (deletes the `telegram_connections` row).
- `src/api/telegramAuth.ts` — `generateTelegramToken()`, `disconnectTelegram()`.
- `src/hooks/useTelegramConnection.ts` — query + realtime subscription for the row (auto-updates UI when the bot inserts the connection).

Server:
- RLS on `telegram_auth_tokens`: user can insert their own (`user_id = auth.uid()`), cannot read others. No select needed from the client — the token is only used in the bot round-trip.

Routing:
- The bot should also send a deep-link button with each reply (`open_in_app` URL = `spoonsketch://recipe/{id}`). Expo Router handles custom schemes out of the box.

**Acceptance:**
- First-time flow: tap Connect → Telegram opens → Start the bot → return to app → Me tab shows "Connected as @handle" within ~2 seconds (via Realtime).
- Disconnect → row deleted → UI updates → next send to bot gets "connect your account first" reply.
- Without Telegram app installed: user sees the https URL + copy button; paste into any browser with Telegram web → still works.
- Deep link from bot reply: tapping "Open in app →" navigates to `/recipe/<id>`.

One commit. ~half a day.

---

### 8.4 — Supabase Realtime subscription for the recipes list

**Goal:** new recipes from the bot appear in the app's Library within a few seconds, no pull-to-refresh needed.

Client:
- `src/hooks/useRecipesRealtime.ts` — subscribes to `postgres_changes` on `public.recipes` filtered by `user_id = <current>`. On `INSERT` / `UPDATE` / `DELETE`, invalidates the `['recipes']` and `['recipe', id]` TanStack queries.
- Mounted at the top of the authenticated tree (`app/(tabs)/_layout.tsx`) so it's alive whenever the user is in the tab navigator.

Edge: Realtime must be enabled for the `recipes` table in Supabase — a one-line migration to publish it (`alter publication supabase_realtime add table public.recipes;`).

**Acceptance:**
- Send a URL to the bot while the app's Library tab is open.
- Within ~5 seconds of the bot's "Saved!" reply, the new recipe card animates into the library without user action.
- App background → foreground after the bot saved → Realtime reconnects + the recipe is present (via the refetch-on-mount path, independent of the socket).

One commit. ~2 hours.

---

### 8.5 — Bot reply polish + error UX + docs

- Bot reply copy pass: success ("Saved! *{title}* — [Open in app →](...)"), partial extraction ("Got a partial read — open in app to fill in the rest"), failure, quota hit ("You've hit your monthly Telegram limit — open the app to upgrade"), unknown input.
- `/help` command describing what the bot accepts.
- `FEATURES.md`: new section for Me tab Connect Telegram; extend §1 (global) and §8 Import with a note about Telegram as a third import surface.
- `MANUAL_TESTS.md`: Phase 8 scenarios (connect, disconnect, url, photo, unknown sender, quota, offline app / online bot round-trip, deep link).
- `BACKEND.md`: cross-reference the new tables + secret names.
- `NEXT_STEPS.md`-style laptop checklist for the Railway setup.

One small commit.

## Data model

Already-present tables used:
- `telegram_connections(id, user_id, telegram_id, username, connected_at)`
- `telegram_jobs(id, user_id, telegram_id, input_type, raw_url, image_storage_path, status, recipe_id, error_message, created_at, updated_at)`
- `ai_jobs(..., job_type ∈ ('url_extract','image_extract','auto_sticker'))`

New table added in 8.1:
- `telegram_auth_tokens(id, user_id, token, created_at, expires_at, consumed_at)`

Storage buckets used:
- `telegram-screenshots/{userId}/{jobId}.jpg` (private)

Realtime publications added in 8.4:
- `public.recipes` added to `supabase_realtime` publication.

## Costs

| Service | Monthly cost | Notes |
|---|---|---|
| Railway Hobby | $5 | 512MB RAM, always-on. Fine for MVP. |
| Upstash Redis (free) | $0 | Free tier is 10k commands/day — plenty for the bot's queue until we have real users. |
| Supabase Storage (telegram screenshots) | ~$0 | Pro plan already includes 100GB. |
| Anthropic Haiku (bot traffic) | ~$0.01 per extract | Counts against same per-user free-tier caps as in-app import. |

Total incremental monthly spend: **~$5/month**.

## Files touched (summary)

New:
- `supabase/functions/telegram-auth/index.ts`
- `supabase/migrations/<date>_telegram_auth_tokens.sql`
- `telegram-bot/` (new Node package; see 8.2 tree)
- `src/api/telegramAuth.ts`
- `src/hooks/useTelegramConnection.ts`
- `src/hooks/useRecipesRealtime.ts`
- `src/components/me/TelegramConnectCard.tsx` (or inline in me.tsx if tiny)
- `.claude/plans/phase-8-telegram-bot.md` (this file)

Edited:
- `supabase/functions/extract-recipe/index.ts` — accept `image_url`, thread through to Haiku as image block
- `app/(tabs)/me.tsx` — replace placeholder with Connect Telegram flow
- `app/(tabs)/_layout.tsx` — mount `useRecipesRealtime`
- `FEATURES.md`, `MANUAL_TESTS.md`, `BACKEND.md`, `NEXT_STEPS.md`

## Open questions (flag before coding)

1. **Bot talks to Haiku via the Edge Function, or directly?** Leaning toward **via the Edge Function** (single source of prompt truth, single quota counter, single place to rotate keys). Needs the `X-Spoon-Bot-Secret` header trick (extract-recipe accepts a "bot auth" mode that trusts a `user_id` in the body instead of the JWT). Alternative: bot duplicates the Haiku call, Edge Function stays user-only. The shared-secret path is ~30 more lines in extract-recipe but keeps the prompt authoritative. Decision needed before 8.2.
2. **Bot username.** `@SpoonAndSketchBot` vs `@SpoonSketchBot` vs `@spoonsketch_bot`. Telegram doesn't allow spaces / ampersands. Check availability on BotFather first.
3. **Multi-photo album (a user forwards a carousel of 4 screenshots):** just take the first photo? or enqueue all four? v1: first photo only. Document the limitation in the bot reply: "Send screenshots one at a time for now."
4. **Recipe link in reply vs. auto-open:** we reply with a markdown link (`[Open in app →](spoonsketch://...)`). That's a tap. Auto-opening deep links from Telegram isn't possible (user must tap). No action needed, just call it out in UX copy.
5. **Bot gives up after how many failures in a row?** No auto-unlink on errors — admin-handled for now. If a user's chat is flooded with failures, they can disconnect + reconnect themselves.

## Risks / gotchas

- **Webhook vs. polling.** Telegraf defaults to long polling, which is friendlier to deploy than webhooks (no TLS cert management, no public URL reveal). MVP: polling. When we have real traffic, switch to webhooks + a public Railway domain. Document the switch in `telegram-bot/README.md`.
- **Service-role key leakage** — Railway env vars must be private. Add a `telegram-bot/.env.example` and a README instruction. Never commit a real key.
- **BullMQ stuck jobs** — if the worker crashes mid-job, BullMQ's `stalledInterval` re-claims it. Keep the default 30s.
- **Photo size** — Telegram delivers multiple resolutions. We pick the largest via `photo.at(-1)`. Still cap Storage uploads at 5MB as a sanity guard.
- **Image content moderation** — Haiku 4.5 refuses obviously harmful content; the bot will surface the refusal as "Couldn't read this one, sorry." No extra moderation layer in v1.
- **Expo deep links** — verify `spoonsketch://recipe/{id}` actually opens the right screen after a cold app start. If not, add an `app.json` scheme block + `Linking` handler. Probably works out of the box with Expo Router's universal link support.
- **Realtime permissions** — the client needs `SELECT` on `recipes` (RLS already grants this per user). Realtime reuses that RLS, so nothing new to configure.

## Order of operations

1. **8.0** — Edge Function `image_extract` path. (half-day)
2. **8.1** — `telegram-auth` + tokens table. (half-day)
3. Decide on Open Question #1 (bot→function auth mode).
4. **8.2** — Bot service on Railway. (full day)
5. **8.3** — Me-tab Connect Telegram UI. (half-day)
6. **8.4** — Realtime subscription. (2 hours)
7. **8.5** — Polish + docs. (2 hours)
8. Device walk-through of Phase 8 scenarios in MANUAL_TESTS.md.
9. Flip `PLAN.md` Phase 8 → ✅ Done.

Total: ~3 days of focused work, split across 5–6 sessions.

## Not in this plan (explicit)

- **WhatsApp bot** — separate plan. Summary of why: WhatsApp requires Meta Business verification + pre-approved message templates + 24-hour session windows + per-conversation pricing (Cloud API: ~$0.01–$0.10 per conversation depending on region). Telegram is free, instant, and has no approval process, so it ships first. If we decide WhatsApp is worth the lift after Phase 11, it would be its own 3–5 day plan using Twilio or Meta Cloud API as the transport and reusing the same BullMQ queue + worker. Core differences to plan for:
  - Stricter content-type handling (WhatsApp templates are text-first; free-form replies only in an active session)
  - Different auth flow (QR-code based WhatsApp Business login or phone-number verification)
  - Cost-aware send strategy (avoid un-templated replies outside the 24h window)
- **Group chats** — bot only serves 1:1 DMs in Phase 8.
- **Multi-user per chat** — not modelled.
- **Voice notes / video messages** — not modelled.
- **Bot commands beyond /start and /help** — no.
- **Admin Retool dashboard for `telegram_jobs` failures** — post-launch.
