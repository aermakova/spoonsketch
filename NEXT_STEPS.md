# Where I left off — next steps

Pick this up whenever. Everything here is what the user (Angy) needs to do personally — code is already written + committed. Last updated: 2026-04-24.

## Status at a glance

### Done ✅

| Area | What shipped |
|---|---|
| Phases 1–6 | Foundation, auth, library, canvas editor, drawing/layers, book builder |
| Phase A | Description atomized into its own movable block in every template |
| Phase B | Full canvas atomization (9-atom set per template) + schemaVersion: 3 migration |
| Phase E | Paper pattern (blank/lined/dotted/grid) at cookbook level |
| Phase F (client) | PDF export via expo-print: all 6 templates, embedded fonts, stickers as base64, drawing strokes as SVG, preset-aware fonts, corner leaf, dots + badges as inline SVG |
| Phase 7.1 | AI URL import (FAB → Paste Link) — Edge Function live, credits flowing |
| Phase 7.2 | Make me Sketch (auto-sticker) — tested on device |
| Phase 8.0 | `extract-recipe` accepts `image_url`; `telegram-screenshots` bucket created |
| Phase 8.1 | `telegram-auth` Edge Function + `telegram_auth_tokens` table |
| Phase 8.2 | Bot service code (Telegraf + BullMQ + Upstash-ready + in-process fallback) |
| Phase 8.3 | Connect Telegram UI in Me tab |
| Phase 8.4 | Realtime subscription on `recipes` |
| Shelves redesign | Phase 1 — books-on-wooden-shelves grid, long-press action sheet |
| Phase 8.2 (bot running locally) | Bot started end-to-end — Connect Telegram + recipe URL import work on device |
| 22 bug fixes | BUG-001 → BUG-022 all ✅ Fixed (see BUGS.md) |

### In progress 🟡

| Area | Where it's at | What's blocking |
|---|---|---|
| Phase 8 polish (8.5) | Connect + URL import working; screenshot import + bot copy pass + doc closeout still pending | Walk through MANUAL_TESTS Phase 8 scenarios, log any issues as new bugs |
| Phase 8 production (Railway + Upstash) | Local bot proven; needs always-on host | Sign up Upstash + Railway, paste env, deploy |

### Next up ⏳

| Priority | Item | Blocker / size |
|---|---|---|
| **Next** | Run the bot locally, test end-to-end | Section 1 below (~10 min) |
| **Next** | Phase 8.5 — MANUAL_TESTS Phase 8 scenarios + FEATURES/BACKEND doc updates | Section 2 (~30 min) |
| Soon | Phase 8 production — Upstash Redis + Railway | Section 3 (~30 min, $5/mo) |
| Later | Shelves Phase 2 — `cover_color` + `cover_sprig` DB columns + pickers | Angy to drop sprig PNGs + wood PNG into `assets/` first |
| Later | Phase 9 — PDF print order via Lulu xPress | Depends on Phase F server renderer (BUG-010) |
| Later | Phase 10 — Cook mode (screen-on cooking view) | Not started |
| Later | Phase 10.5 remaining — expanded colour picker, Apple Pencil pressure | Not started |
| Later | MVP integrations — RevenueCat, Apple/Google/magic-link sign-in, push, MMKV, PostHog, Sentry, i18n, password reset | Each is its own 2-hour to 1-day effort |
| Later | Phase 11 — Launch prep: north-star test, device regression, store assets | Everything else first |

### Known deferrals 🟠

| Item | Why deferred |
|---|---|
| BUG-010 — paper pattern missing from exported PDF | Needs Phase F server-side Puppeteer renderer; client-side expo-print doesn't handle this cleanly |
| Phase F server renderer | Needed for bulk book export + Lulu. Non-blocking for single-recipe export, which ships today |
| Tab bar icon swap (emojis → line icons) | Cosmetic; ~15 min whenever |

---

## 1. Phase 8 — Telegram bot: get it running (local, 10 minutes)

This path skips Railway + Upstash and runs the bot on your Mac during development. Fine for smoke-testing. See step 3 below for production.

### 1a. Confirm what's already done

- ✅ `@spoonsketch_bot` registered in BotFather, token saved.
- ✅ `ANTHROPIC_API_KEY` + `TELEGRAM_BOT_SHARED_SECRET` set on Supabase (`supabase secrets list` to verify).
- ✅ All 3 Phase 8 migrations applied via Supabase dashboard SQL editor.
- ✅ Edge Functions deployed (`extract-recipe`, `telegram-auth`).

If any of the above looks wrong, check `.claude/plans/phase-8-telegram-bot.md` for the one-line fix.

### 1b. Set up the bot's local env

```bash
cd telegram-bot
cp .env.example .env
```

Open `.env` and fill in (4 values — skip `REDIS_URL` for now):

| Variable | Where to get it |
|---|---|
| `TELEGRAM_BOT_TOKEN` | BotFather — if lost: DM @BotFather → `/mybots` → Spoon & Sketch Bot → API Token → "Show token" |
| `TELEGRAM_BOT_SHARED_SECRET` | The hex string you pasted into `supabase secrets set` for the bot. Same value must be on both sides. If lost: generate a new one with `openssl rand -hex 32`, set on Supabase, also use here |
| `SUPABASE_URL` | `https://uvxkipafnzclvxtlhfqi.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → `service_role` key (long JWT, starts with `eyJ…`). Do NOT confuse with the anon key. |

### 1c. Run the bot

```bash
npm install
npm run dev
```

Expected output:

```
[queue] ⚠️  REDIS_URL not set — running in no-queue fallback mode. ...
[queue] in-process worker ready (no Redis)
[bot] launched (long polling)
```

Keep the terminal open. The bot is now listening for messages. It'll die if you close the terminal — for always-on, see step 3.

### 1d. Test it end-to-end

1. Reload the Spoon & Sketch app on your phone.
2. Me tab → **Connect Telegram**.
3. Telegram opens with `@spoonsketch_bot`. Tap **Start**.
4. Bot should reply: `Connected, @yourhandle!`.
5. Send the bot a recipe URL: `https://www.bbcgoodfood.com/recipes/tomato-soup`.
6. Bot replies `Got it! Extracting your recipe…` → ~10s later → `Saved! *Tomato soup* [Open in app →]`.
7. Tap the deep link → opens the recipe in the app.
8. The recipe also appears in the app's library within ~2s (Realtime).

If any step fails, tail the Mac terminal for the error. The first failure is usually: `extract-recipe` returns `401` — fix with `supabase functions deploy extract-recipe` (the current deployed version needs the bot-mode auth code that was added yesterday).

---

## 2. Phase 8 — Telegram bot: polish (~30 min) *(optional, do this when tests pass)*

Plan sub-phase 8.5 — not code-critical, but needed to close out the plan cleanly.

- Walk through the Phase 8 scenarios in `MANUAL_TESTS.md` (they don't exist yet — write them as you test).
- Update `FEATURES.md` §1.7 (limits) + §13 (integrations) with Telegram.
- Update `BACKEND.md` with a cross-reference to the new `telegram_auth_tokens` table + shared-secret pattern.
- Flip `PLAN.md` Phase 8 row to ✅ Done.
- Log any bugs surfaced during device testing in `BUGS.md`.

---

## 3. Phase 8 — Telegram bot: production (Redis + Railway, ~30 min)

**Only needed when you're ready for the bot to run 24/7 without your laptop open.** Local dev is fine for testing.

### 3a. Redis (Upstash, free tier)

Full steps in `telegram-bot/README.md` §"Switch to Redis-backed queue". TL;DR:

1. Sign up at https://upstash.com (3 min).
2. Create Database → region closest to Railway (default `us-west-1`).
3. Copy the `rediss://default:...@us1-xxx.upstash.io:6379` connection URL.
4. Add `REDIS_URL=rediss://...` to your local `.env` and restart — you should now see `[queue] Redis-backed worker ready` instead of the no-queue warning.

### 3b. Railway

1. Sign up at https://railway.app, link GitHub account.
2. New Project → Deploy from GitHub → select `spoonsketch` repo.
3. In the service settings, set **Root Directory** to `telegram-bot`.
4. Variables tab → paste the same 5 values from your local `.env`:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_BOT_SHARED_SECRET` (must match Supabase)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REDIS_URL`
5. Deploy. Tail logs until you see `[bot] launched (long polling)`.

Cost: Railway Hobby is $5/mo; Upstash free tier covers our bot traffic.

### 3c. Once Railway is up

Turn off your local Mac bot (`Cmd-C` in the terminal). The Railway bot takes over automatically. Both can't run on the same token simultaneously — Telegram rejects the second poller.

---

## 4. Smaller loose ends (lower priority)

These aren't blockers but are noted in various docs:

- **Shelves Phase 2** — asset-gated. Drop your sprig PNGs + wood PNG into `assets/sprigs/` and `assets/shelves/`, then uncomment the source map in `src/components/shelves/Sprig.tsx` + `WoodShelf.tsx`. Then flip the plan's Phase 2 to in-progress + add the DB migration for `cover_color` / `cover_sprig`.
- **Tab bar icon swap** — emojis → `@expo/vector-icons` Feather set. ~15 min cosmetic polish.
- **BUG-010** — paper pattern in PDF export. Deferred since Phase F server renderer; documented on the ticket.
- **MVP integrations still missing** — RevenueCat, Apple/Google/magic-link sign-in, push notifications, MMKV, PostHog, Sentry, i18n, password reset. None blocking the north-star test but all promised in `PLAN.md`.

---

## 5. How to resume with a fresh Claude session

If you want a fresh Claude session to pick up where the last one left off, the recipe is:

1. Open `.claude/handoff-prompt.md`.
2. Copy the fenced code block inside.
3. Paste into a new Claude Code session (claude.ai/code or a fresh CLI run).
4. The new session will read the plan files + docs and orient itself.

Or just say: "continue Phase 8 per `.claude/plans/phase-8-telegram-bot.md` — last commit was `d2f61a6`, Redis switch + 8.5 polish still pending". Either works.

---

## 6. Daily commands cheat sheet

```bash
# Pull latest changes
git pull

# What's changed since my last commit
git log --oneline -10
git status

# Deploy Edge Function changes (after editing supabase/functions/...)
supabase functions deploy extract-recipe
supabase functions deploy telegram-auth
supabase functions deploy auto-sticker

# Check Supabase secrets
supabase secrets list

# Run the Expo app
npx expo start --lan --port 8082                                                   # normal
npx --yes qrcode "exp://$(ipconfig getifaddr en0):8082" -o /tmp/qr.png && open /tmp/qr.png   # QR for phone

# Run the Telegram bot (local)
cd telegram-bot
npm run dev

# View function logs (dashboard only — CLI doesn't have logs command)
# https://supabase.com/dashboard/project/uvxkipafnzclvxtlhfqi/functions/<name>/logs
```
