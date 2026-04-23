# Plan — Phase 8b: WhatsApp bot ("send recipe to our WhatsApp number")

**Owner:** Angy
**Target phase:** Parallel/successor to Phase 8 (Telegram). Not on the master tracker yet — tentatively slotted between Phase 8 and Phase 9.
**Depends on:** Phase 7 (`extract-recipe` Edge Function + `ai_jobs` + Haiku infra) and Phase 8's bot-service + BullMQ pattern (we reuse the worker).
**Status:** ⏳ Not started (plan drafted 2026-04-22)

## Goal

Make **WhatsApp** a second, frictionless recipe-capture channel alongside Telegram.

User flow:

> User in WhatsApp → chats with the Spoon & Sketch number (`+1-555-xxxx` or equivalent) → pastes a URL or sends a photo → within 15–30 seconds the recipe appears in their Library.

One-time setup flow:

> App → Me tab → "Connect WhatsApp" → tap "Open WhatsApp" → pre-filled message `/connect <token>` → user taps Send → bot validates token → WhatsApp session now linked to their account.

## Why ship this *after* Telegram

| Aspect | Telegram | WhatsApp |
|---|---|---|
| Approval | None | Meta Business Verification (days–weeks) |
| Free dev sandbox | Yes (BotFather in minutes) | Twilio sandbox or Meta test number (both limited to pre-joined testers) |
| Cost | Free | 1 000 free conversations/month, then ~$0.005–$0.07 per conversation by region + category |
| Auth UX | `/start <token>` deep link | `wa.me/<number>?text=/connect%20<token>` (pre-filled) |
| Free-form replies | Anytime | Only within 24h of the user's last message; outside that, templates only |
| Audience | Strong in US / UA / tech-forward | Dominant in EU / LatAm / global mainstream |

Telegram validates the "send to a bot" UX first for free. WhatsApp is worth the lift only after signal that bot-as-inbox works for users.

## North-star acceptance

- Send a recipe URL to our WhatsApp number from a connected account → recipe appears in the app within 30 s.
- Send a photo → recipe appears within 45 s.
- First-time connect works end-to-end in WhatsApp + app without manual copy-paste.
- Free-tier AI caps are shared with in-app import and the Telegram bot (not doubled).
- Unknown / unconnected senders get a single onboarding reply and are not stored.
- Media never leaves our stack: we fetch from Meta within the 1h URL window, re-upload to Supabase Storage.

## What's in / out of scope

| ✅ In | ⏸ Deferred |
|---|---|
| Transport: Twilio WhatsApp (dev) → Meta Cloud API (production) | Group chats |
| 1:1 inbound text + photo messages | Voice notes, documents, location, stickers |
| Token-based account linking | Any outbound push-style messaging (no templates needed in v1) |
| Shared BullMQ worker with Telegram bot | WhatsApp marketing messages / re-engagement |
| `wa.me/…?text=/connect <token>` one-tap link | QR-based linking flow |
| Session-window awareness (no outbound templates) | Approved message templates (delayed to Phase 9+ if we ever need push) |
| "Connect WhatsApp" UI in Me tab | Replace Telegram — WhatsApp is additive, not a swap |
| Supabase Realtime refresh (shared with Phase 8) | Phone number change / port |
| Meta Business verification runbook | Multi-region phone numbers |
| Docs + scenarios | Admin dashboard |

## Current state (2026-04-22)

- Phase 8 (Telegram bot) is planned but not yet shipped.
- No WhatsApp phone number registered yet.
- No Meta Business Manager account linked.
- No Twilio account.
- `recipes.source_type` enum currently includes `telegram_link` and `telegram_screenshot` but no WhatsApp values.

## Sub-phase breakdown

Seven sub-phases. **8b.5 (Meta Business Verification) is a calendar-day dependency that runs in parallel with coding.** Kick it off the moment 8b.0 lands so it's green by the time 8b.4 is done.

### 8b.0 — DB: new tables, enum extension, RLS

New migration:

```sql
-- Source type enum extension on recipes
alter table public.recipes
  drop constraint if exists recipes_source_type_check;
alter table public.recipes
  add constraint recipes_source_type_check check (source_type in (
    'manual','url_import','screenshot_import',
    'telegram_link','telegram_screenshot',
    'whatsapp_link','whatsapp_screenshot'
  ));

-- Connections
create table public.whatsapp_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique not null references public.users(id) on delete cascade,
  whatsapp_phone   text unique not null,           -- E.164 (+15551234567)
  display_name     text,
  connected_at     timestamptz not null default now()
);

-- One-time tokens (same shape as telegram_auth_tokens from Phase 8)
create table public.whatsapp_auth_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  token       text unique not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);

-- Jobs
create table public.whatsapp_jobs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.users(id) on delete cascade,
  whatsapp_phone      text not null,
  input_type          text not null check (input_type in ('link','screenshot')),
  raw_url             text,
  image_storage_path  text,
  status              text not null default 'queued'
                        check (status in ('queued','processing','done','failed')),
  recipe_id           uuid references public.recipes(id) on delete set null,
  error_message       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index on public.whatsapp_jobs(user_id);
create index on public.whatsapp_jobs(whatsapp_phone);
create index on public.whatsapp_auth_tokens(token);
create index on public.whatsapp_auth_tokens(user_id);
```

RLS (mirrors Phase 8 Telegram):
- `whatsapp_connections`: owner can SELECT + DELETE their row.
- `whatsapp_auth_tokens`: owner can INSERT their row; no read from clients (server-only lookup by token).
- `whatsapp_jobs`: owner can SELECT their own (for optional in-app observability); inserts + updates via service role only.

Also: add `public.whatsapp_connections` and `public.recipes` (if not already) to the `supabase_realtime` publication so the Me tab + Library refresh automatically.

Run `supabase gen types` after the migration and commit the refreshed types file.

**Acceptance:**
- Migration applies cleanly locally + in Supabase Studio.
- A user can insert a token row via PostgREST; cannot read other users' tokens.
- A recipe with `source_type = 'whatsapp_link'` saves without constraint violation.

One commit. ~1 hour.

---

### 8b.1 — `whatsapp-auth` Edge Function

**Goal:** exchange a single-use token for a `whatsapp_connections` row. Mirrors `telegram-auth` from Phase 8.

Server:
- `supabase/functions/whatsapp-auth/index.ts`
- Verifies `X-Spoon-Bot-Secret` header against `WHATSAPP_BOT_SHARED_SECRET` (distinct from the Telegram secret — different services, different rotation cadence).
- Body: `{ token: string, whatsapp_phone: string, display_name?: string }`.
- Logic: look up token → check not expired + not consumed → upsert `whatsapp_connections` row → mark token consumed → return `{ connected: true, user_id }`.
- Error codes: `invalid_token`, `token_expired` (410), `token_already_used` (409), `unauthorized` (401), `bad_request` (400).

Client:
- `src/api/whatsappAuth.ts` — `generateWhatsappToken()` returns `{ token, waLink }` where `waLink` is the pre-filled `wa.me/…?text=/connect%20<token>` URL built from `EXPO_PUBLIC_WHATSAPP_NUMBER`.
- `disconnectWhatsapp()` deletes the `whatsapp_connections` row.

**Acceptance:**
- Happy-path POST with the bot secret → 200, row inserted.
- Missing secret → 401.
- Token older than 10 minutes → 410.
- Second call with same token → 409.

One commit. ~half a day.

---

### 8b.2 — Transport choice + webhook receiver

**Goal:** receive WhatsApp messages. Two routes:

| Aspect | **Twilio WhatsApp** (recommended for dev) | **Meta Cloud API** (target for production) |
|---|---|---|
| Onboarding | ~5 min with a Twilio account, sandbox works with no Meta verification | Requires Meta Business verification (can take days); phone number provisioning; WhatsApp Business Account link |
| Webhook shape | Twilio form-encoded POST to our endpoint | JSON POST with WhatsApp-specific signed payload |
| Media access | Twilio-hosted URL, basic-auth protected | Meta-hosted URL, bearer-auth protected, 1-hour expiry |
| Cost | ~2× Meta rates | Cheapest after the free tier |
| Migration path | Swap transport adapter; business logic unchanged | — |

Decision: **start on Twilio sandbox** for development velocity; **plan the Meta Cloud API migration as the last step before going live** (sub-phase 8b.5 kicks off the Meta Business verification the moment 8b.0 lands so the paperwork runs in parallel).

Implementation:

`telegram-bot/` from Phase 8 is renamed to `bot-service/` — a single Railway service that hosts both the Telegram bot *and* the WhatsApp webhook receiver on different routes. (Rationale: one service = one Redis connection = one worker = one deploy. Splitting would double infra cost for no real isolation benefit.)

New files in `bot-service/`:
```
src/whatsapp/
  ├── index.ts          # Express/Hono route handlers: POST /whatsapp/webhook, GET /whatsapp/webhook (Meta verify)
  ├── twilio.ts         # Twilio transport adapter (parse form-encoded body, download media)
  ├── meta.ts           # Meta Cloud API transport adapter (JSON body, signed webhook verification, media fetch)
  ├── transport.ts      # Interface both adapters satisfy
  ├── send.ts           # Outbound message helper ("Saved! …" / "Got it, reading…") — transport-aware
  └── router.ts         # Routes inbound messages to the shared job enqueue (see 8b.3)
```

Env vars (Railway):
- `WHATSAPP_TRANSPORT` — `twilio` | `meta`
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- Meta: `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_APP_SECRET`, `META_WHATSAPP_VERIFY_TOKEN`
- Shared: `WHATSAPP_BOT_SHARED_SECRET`, `APP_DEEPLINK_BASE`

Webhook verification:
- Meta: HMAC-SHA256 of raw body vs. `X-Hub-Signature-256` header using `META_WHATSAPP_APP_SECRET`.
- Twilio: X-Twilio-Signature HMAC-SHA1 of (URL + sorted params) using `TWILIO_AUTH_TOKEN`.

Route for `GET /whatsapp/webhook` (Meta challenge response, for Cloud API verification flow) returns `hub.challenge` on match.

Route for inbound: transport adapter parses → hands off `{ userPhone, kind: 'text'|'photo', text?, mediaUrl? }` to `router.ts` → router calls `handleInbound` which looks up `whatsapp_connections`, branches on connected / not-connected, and enqueues the job for the worker.

**Acceptance:**
- Twilio sandbox: send a text "hello" from a linked WhatsApp number → Railway logs show the webhook; router replies "Connect your account first."
- Meta mode (once verified): same, via Meta's webhook tester.
- Webhook signature verification rejects tampered payloads (write one unit test per transport, skip-if-no-creds).

One commit. ~1.5 days (including Railway redeploy cycle + sandbox setup).

---

### 8b.3 — Worker: handle `whatsapp_jobs` via shared queue

**Goal:** the existing BullMQ worker from Phase 8 now processes both Telegram and WhatsApp jobs, queuing them to the same `recipe-extract` queue with a `source` discriminator.

Changes to `bot-service/src/worker.ts`:
- Job payload gains `source: 'telegram' | 'whatsapp'` and `chat` (Telegram chatId or WhatsApp phone).
- After `extract-recipe` returns the recipe JSON: insert into `recipes` with `source_type` = `whatsapp_link` / `whatsapp_screenshot` accordingly.
- Insert `whatsapp_jobs` row mirroring what Phase 8 does for `telegram_jobs`.
- Outbound reply uses the transport-aware `send.ts` helper: "Saved! *{title}* — [Open in app](spoonsketch://recipe/{id})".
- Within 24-hour session window = free-form reply; **we never send outside the window in v1**, so no templates needed.

Worker retry policy unchanged (attempts: 2, backoff 5s).

**Acceptance:**
- Connected WhatsApp user sends a URL → bot replies "Got it! Extracting…" within 1s, then "Saved! …" within 30s.
- Same user sends a photo → bot replies within 45s. Image is stored in `whatsapp-screenshots/{userId}/{jobId}.jpg`, extracted via the `image_url` mode of `extract-recipe` (from Phase 8.0).
- Failed extraction → bot replies "Hmm, couldn't read that one — try a different link?"; `whatsapp_jobs.status` = `failed` with `error_message`.

One commit. ~half a day.

---

### 8b.4 — "Connect WhatsApp" UI in Me tab

**Goal:** same pattern as Phase 8.3 Telegram but with a `wa.me` deep link.

Client:
- `src/components/me/WhatsappConnectCard.tsx` — below the Telegram card.
- Uses a new `useWhatsappConnection()` hook (shape mirrors `useTelegramConnection()`).
- Tapping **Connect WhatsApp**:
  1. `generateWhatsappToken()` → `{ token, waLink }`.
  2. `Linking.openURL(waLink)` → opens WhatsApp pre-filled with `/connect <token>`.
  3. User taps Send in WhatsApp → bot validates → `whatsapp_connections` row inserted.
  4. App's Realtime subscription on `whatsapp_connections` flips the UI to "✓ Connected as +1-555-..." within ~2 s.
- Fallback for devices without WhatsApp installed: copy-to-clipboard button + the bare number.

Environment:
- New `EXPO_PUBLIC_WHATSAPP_NUMBER` env var (e.g. `15555550199`) — baked into the client bundle, not sensitive.

**Acceptance:**
- First-time flow: tap Connect → WhatsApp opens with `/connect <token>` pre-filled → send → back to app → Me tab shows "Connected as +1-555-…".
- Disconnect button removes the connection; sending to the bot again yields the "connect your account first" reply.
- Without WhatsApp installed: copy button works; paste into `web.whatsapp.com` → round-trip still succeeds.

One commit. ~half a day.

---

### 8b.5 — Meta Business verification + production transport migration

**Runs in parallel, kicked off as soon as 8b.0 lands.**

Checklist (calendar-day work, not coding):
1. Create a Meta Business Manager account (if not already).
2. Verify the business (tax ID / company docs — days to weeks).
3. Create a WhatsApp Business Account inside Meta Business.
4. Provision or port a phone number.
5. Request "Messaging — WhatsApp" access for the app.
6. Generate a permanent `META_WHATSAPP_TOKEN` via System User + role assignment.
7. Configure the webhook URL (Railway public endpoint) + `META_WHATSAPP_VERIFY_TOKEN`.
8. Flip `WHATSAPP_TRANSPORT` env var from `twilio` → `meta` on Railway.
9. Send a couple of end-to-end messages to confirm production path.

No pre-approved message templates needed in v1 — we only reply inside the 24h session window.

**Acceptance:**
- Production phone number can receive messages; bot responds via Meta's API, not Twilio.
- Meta webhook passes signature verification.

No commit for this sub-phase specifically — any wiring adjustments land as tiny follow-ups under 8b.2/8b.3.

---

### 8b.6 — Docs + manual tests

- `FEATURES.md`: new Me-tab subsection (WhatsApp alongside Telegram). Reference in §8 Import as a third inbound channel.
- `MANUAL_TESTS.md`: Phase 8b scenarios (connect happy path; disconnect; url message; photo message; unknown sender; quota hit; session-window expiry — bot goes 25h without user message and then user replies; media-URL expiry — worker must fetch within 1h; concurrent Telegram + WhatsApp messages from the same user).
- `BACKEND.md`: cross-reference the new tables, secret names, and the two transport options.
- `NEXT_STEPS.md`: Railway env-var + Meta Business checklist.

One small commit.

## Data model

New tables (all in 8b.0):
- `whatsapp_connections(id, user_id, whatsapp_phone, display_name, connected_at)`
- `whatsapp_jobs(id, user_id, whatsapp_phone, input_type, raw_url, image_storage_path, status, recipe_id, error_message, created_at, updated_at)`
- `whatsapp_auth_tokens(id, user_id, token, created_at, expires_at, consumed_at)`

Enum extension:
- `recipes.source_type` gains `whatsapp_link`, `whatsapp_screenshot`.

Storage bucket:
- `whatsapp-screenshots/{userId}/{jobId}.jpg` (private, Edge Function access only).

`ai_jobs`:
- Reuses the existing `url_extract` / `image_extract` job types.

## Costs

| Service | Monthly cost | Notes |
|---|---|---|
| Twilio WhatsApp (dev, sandbox) | $0 up to 1 message/sec to test numbers | Zero-friction but production needs Meta verification |
| Twilio WhatsApp (production) | Per-message pricing, ~2× Meta | Keep as a fallback only |
| Meta Cloud API | 1 000 free conversations / month; then ~$0.005–$0.07 per conversation | Lower cost at scale |
| Railway bot-service | Already covered by Phase 8's $5/mo line | No additional cost |
| Upstash Redis | Shared with Phase 8 | — |
| Meta Business number | Varies by region (often $0 with port, $5–15/mo new) | — |

Incremental monthly cost vs. Phase 8: **$0–$15/month** at dev and pre-launch volumes. At 10k conversations/month: ~$50–$700 depending on conversation categories.

## Files touched (summary)

New:
- `supabase/migrations/<date>_whatsapp_tables.sql`
- `supabase/functions/whatsapp-auth/index.ts`
- `bot-service/src/whatsapp/{index,twilio,meta,transport,send,router}.ts` (bot-service = renamed telegram-bot from Phase 8)
- `src/api/whatsappAuth.ts`
- `src/hooks/useWhatsappConnection.ts`
- `src/components/me/WhatsappConnectCard.tsx`
- `.claude/plans/phase-8b-whatsapp-bot.md` (this file)

Edited:
- `bot-service/src/worker.ts` — handle `source: 'whatsapp'` branch
- `bot-service/package.json` — add Twilio SDK / Meta Cloud API client (probably just `axios`) as needed
- `bot-service/src/index.ts` — mount WhatsApp webhook route
- `app/(tabs)/me.tsx` — render `WhatsappConnectCard` below Telegram
- `FEATURES.md`, `MANUAL_TESTS.md`, `BACKEND.md`, `NEXT_STEPS.md`

## Open questions (flag before coding)

1. **Keep the single `bot-service` process, or split into two services?** Leaning single-process for cost + operational simplicity. Split only if Railway can't keep up under combined load (far beyond MVP volumes).
2. **Unify bot tables under a generic `messaging_*` schema now, or live with per-channel duplication?** Leaning toward duplication for v1 — changing Phase 8 tables after it's shipped is churn. Consolidate if/when we add a third channel (Instagram DM, SMS, email).
3. **Phone number acquisition.** Easier path is Twilio-provided number (works in sandbox and production). Meta's direct number requires port or purchase via Meta Business. Decision doesn't block coding; lock it before 8b.5.
4. **Connect-token message format.** `/connect ABCD1234` vs. just the token alone (`ABCD1234`). Leaning toward the `/connect ` prefix — easier to parse via regex, clearly signals intent, harder to bot-spoof with a random message.
5. **Fallback when the user is inside WhatsApp but has typed no prior message:** the `wa.me` pre-fill reliably opens a new chat, but on some Android builds it doesn't auto-send. Document "tap Send" in the UI copy. Not a blocker.
6. **Do we need to handle the `document` (PDF) message type at all?** v1 no — only text and photo. PDF recipe PDFs → deferred to the File tab + Phase 9 pipeline.

## Risks / gotchas

- **Meta Business verification is the hard calendar dependency.** Start it on day one. If it fails / stalls, we can ship on Twilio for longer as a fallback (at ~2× cost).
- **Session-window drift.** If we ever want to send a non-reply message (e.g. "your recipe was imported by our AI overnight"), we need a pre-approved template. V1 stays strictly reactive — no outbound.
- **Media URL TTL.** Meta's media URLs expire in 1 hour and require bearer auth. Our worker *must* download the image as soon as the webhook is received (not at enqueue time) and stash it in Storage before the original URL expires. Build a retry on media-fetch failure.
- **Signature verification bugs.** Off-by-one mistakes here mean we reject real webhooks. Keep the verification logic in a tiny testable module with fixtures from Meta's docs.
- **Phone-number spoofing.** WhatsApp authenticates the sender phone number end-to-end. Still — *don't* trust the phone number alone for auth. Always go through the token flow.
- **Global rollout.** WhatsApp conversation rates vary hugely (Brazil ≠ Germany ≠ Ukraine). Budget for the likely user regions, not the cheapest category.
- **Privacy review.** Storing phone numbers needs a privacy-policy update: call out what we store, why, and how to delete (disconnect button already does it; document the side effect on past jobs — we keep `whatsapp_jobs` rows with the phone retained for auditing, or scrub on disconnect — decide before launch).

## Order of operations

1. **8b.0** — migrations + enum extension. *(1h)*
2. **8b.5 (parallel)** — kick off Meta Business verification paperwork. *(calendar days)*
3. **8b.1** — `whatsapp-auth` Edge Function + token flow. *(half day)*
4. **8b.2** — Transport adapters + webhook receiver (Twilio sandbox first). *(1.5 days)*
5. **8b.3** — Worker branch for `whatsapp_jobs`. *(half day)*
6. **8b.4** — Connect WhatsApp UI in Me tab. *(half day)*
7. **Test in Twilio sandbox** end-to-end.
8. **8b.5 completion** — flip `WHATSAPP_TRANSPORT=meta` on Railway once verification passes.
9. **8b.6** — Polish + docs.
10. Flip WhatsApp from "deferred" to an active entry in `PLAN.md` master tracker once green.

Total coding: ~3 days (similar to Phase 8). Calendar: **1–3 weeks** due to Meta Business verification.

## Not in this plan (explicit)

- **Pre-approved message templates / outbound marketing.** No.
- **Group chats.** No.
- **Voice / video / document / location messages.** No.
- **Replacing Telegram.** WhatsApp is additive.
- **SMS fallback when user has no WhatsApp.** No; they can use Telegram or the in-app Paste Link.
- **Ukrainian-native phone-number sourcing.** If the target is UA users, research whether a UA Meta-verified number outperforms a US number for trust. Post-launch.
- **Two-way settings UI (notification preferences, "mute for 24h", etc.).** No.
