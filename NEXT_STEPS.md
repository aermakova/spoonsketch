# Where I left off — next steps

Pick this up whenever. Everything here is what the user (Angy) needs to do personally — code is already written + committed. Last updated: 2026-04-26.

## Status at a glance

### Done ✅

| Area | What shipped |
|---|---|
| Phases 1–6 | Foundation, auth, library, canvas editor, drawing/layers, book builder |
| Phase A | Description atomized into its own movable block in every template |
| Phase B | Full canvas atomization (9-atom set per template) + schemaVersion: 3 migration |
| Phase E | Paper pattern (blank/lined/dotted/grid) at cookbook level |
| Phase F (client) | PDF export via expo-print: all 6 templates, embedded fonts, stickers as base64, drawing strokes as SVG, preset-aware fonts, corner leaf, dots + badges as inline SVG |
| **Phase 7 — all 5 import tabs** | Paste Link · Type · Photo (≤10 imgs) · File (PDF + .txt) · JSON (bulk ≤20 recipes) · Make me Sketch — `extract-recipe` Edge Function accepts URL / `image_urls[]` / `pdf_url` / `text_content` modes |
| **Phase 8 — Telegram bot end-to-end** | Bot proven on device: URL imports, photo imports (single + media_group batch), CSAM gate, Realtime push to library, deep links via Universal Links. Phases 8.0–8.4 all ✅. Production deploy (Railway + Upstash) still pending — see §3 below. |
| **Edit recipe** | Pencil ✎ icon in Clean view → `/recipe/edit/[id]` with delete-recipe flow |
| Shelves redesign | Phase 1 — books-on-wooden-shelves grid, long-press action sheet (Phase 2 sprig PNGs landed 2026-04-25) |
| **Phase 10.9 engineering — compliance scaffolding (2026-04-25)** | Sign in with Apple code, granular consent UI + server gate, CSAM `moderate-image` Edge Function, in-app account deletion, GDPR Art. 20 data export, EU cookie consent banner. Engineering ✅; legal/admin still pending — see PLAN §C. |
| Marketing brief (2026-04-25) | `MARKETING_BRIEF.md` shipped — handoff to marketing team for the 4-6 onboarding killer-feature screens |
| **Living-doc audit (2026-04-26)** | Synced PLAN / FEATURES / BACKEND / ARCHITECTURE / SCREENS / USER_FLOW / BUGS / CLAUDE / NEXT_STEPS to current code reality. CLAUDE rule #8 strengthened — all 9 docs named + enforcement clause. |
| **26 bug fixes** | BUG-001 → BUG-026 all ✅ Fixed (see BUGS.md). All commit SHAs filled in 2026-04-26 audit. |

### In progress 🟡

| Area | Where it's at | What's blocking |
|---|---|---|
| Phase 8 production (Railway + Upstash) | Local bot proven and works end-to-end; needs always-on host | Angy: sign up Upstash + Railway, paste env, deploy (§3 below, ~30 min, $5/mo) |
| Phase 10.5 — Editor UX polish (2/4) | ✅ Help overlay, ✅ Edit recipe from Clean view. Pending: custom colour picker (~16 colours + wheel), Apple Pencil pressure | Not started — fits anywhere in Week 16 |
| Phase 10.7 — Onboarding screens | Marketing brief shipped 2026-04-25; engineering scaffolding ready | **Waiting on marketing** — 4-6 killer-feature screens (Figma + copy + assets) |
| Phase 10.8 — Account-management surfaces (2/4) | ✅ §19 GDPR data export, ✅ §15 in-app account deletion. Pending: §17 Order history, §18 Manage subscription + Restore Purchases, §20 Email change | RevenueCat install gates §18; the other two are 1-day each |
| Phase 10.9 — Compliance & legal | Engineering ✅. Pending **legal/admin**: lawyer-drafted PP+ToS (EN+UK), EU Rep contract, vendor DPAs, App Store Connect privacy labels + age rating, RoPA, 72h breach runbook, Stripe Tax wire, Report Content button | Mostly Angy's-court work — see PLAN §C / `.claude/research/legal-compliance-research.md` |

### Next up ⏳

| Priority | Item | Blocker / size |
|---|---|---|
| **Next (you)** | §3.5 below — Apple Sign In external setup (Apple Dev portal + Supabase Dashboard) | ~30 min, no code. **Launch blocker.** |
| **Next (you)** | §3 below — Phase 8 production deploy (Upstash + Railway) | ~30 min, $5/mo |
| **Next (marketing)** | Phase 10.7 — 4-6 onboarding killer-feature screens | Brief in `MARKETING_BRIEF.md` |
| Soon (code) | RevenueCat install — IAP wire-up + tier UI + paywall card | ~half day. Gates §18 Manage subscription. |
| Soon (code) | Lulu xPress integration (Phase 9) — print order flow | 2–3 days. Closes the gift loop. Depends on Phase F server PDF renderer (BUG-010). |
| Later (code) | Phase 8.5 — sticker pack expansion + recipe photo + frames + watercolor (5 sub-phases, ~46h) | Phase 8.5A (stickers, ~6h) is the standalone candidate to ship before TestFlight |
| Later (code) | Phase 10 — Cook mode (screen-on cooking view) | Not started |
| Later (code) | MVP integrations — magic-link sign-in, password reset, push notifications, PostHog, Sentry, Google sign-in, i18n | Each is 2-hour to 1-day. None blocking north-star test. |
| Later (code) | Phase 11 — Launch prep: north-star test, device regression, store assets | Everything else first |

### Known deferrals 🟠

| Item | Why deferred |
|---|---|
| BUG-010 — paper pattern missing from exported PDF | Needs Phase F server-side Puppeteer renderer; client-side expo-print doesn't handle this cleanly |
| Phase F server renderer | Needed for bulk book export + Lulu. Non-blocking for single-recipe export, which ships today |
| Tab bar icon swap (emojis → line icons) | Cosmetic; ~15 min whenever |
| Phase 8.5 detail plan file | `.claude/plans/wise-spinning-creek.md` was overwritten twice (cookie banner → marketing brief). Re-create as `.claude/plans/phase-8.5-stickers-photos.md` when sub-phase A starts. The 5-bullet summary in PLAN.md §Phase 8.5 is the current source of truth. |

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

## 2. ~~Phase 8 — Telegram bot: polish~~ ✅ Done (2026-04-26)

All polish items from the previous session shipped — Phase 8 scenarios in `MANUAL_TESTS.md`, `FEATURES.md` §13 (integrations), `BACKEND.md` (telegram_auth_tokens + shared-secret pattern), `PLAN.md` Phase 8 row updated. Bugs surfaced during testing logged as BUG-022 through BUG-026 (all ✅ Fixed). Production deploy is the only remaining bot work — see §3.

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

## 3.5. Sign in with Apple — finish setup (Apple Developer + Supabase, ~30 min)

Code shipped 2026-04-25 — `src/api/auth.ts` `signInWithApple()` + button on `/login`. Two external setup steps required before it works:

### 3.5a. Apple Developer portal

1. Go to https://developer.apple.com/account → **Certificates, Identifiers & Profiles**.
2. **App IDs** → find or create `com.spoonsketch.app` → enable **Sign In with Apple** capability → Save.
3. **Identifiers → Services IDs** → "+" → create a new Service ID (e.g. `com.spoonsketch.app.signinservice`). Description: "Spoon & Sketch Sign in with Apple". Identifier: pick something distinct from the App ID (Apple won't let them match).
4. After creating, click into the Service ID → check **Sign In with Apple** → Configure → Primary App ID = `com.spoonsketch.app` → in **Return URLs** add `https://uvxkipafnzclvxtlhfqi.supabase.co/auth/v1/callback` → Save → Continue → Save.
5. **Keys** → "+" → name "Spoon & Sketch SIWA Key" → check **Sign In with Apple** → Configure → Primary App ID = `com.spoonsketch.app` → Save → Continue → Register → **Download** the `.p8` file (only chance — keep it). Note the **Key ID** shown on screen.
6. Note your **Team ID** (top-right of any Developer page).

You now have: Service ID (`com.spoonsketch.app.signinservice`), Team ID (10-char), Key ID (10-char), `AuthKey_<KeyID>.p8` file.

### 3.5b. Supabase Dashboard

1. https://supabase.com/dashboard/project/uvxkipafnzclvxtlhfqi → **Authentication → Providers → Apple**.
2. Toggle **Enabled**.
3. **Client ID** = your Service ID (e.g. `com.spoonsketch.app.signinservice`).
4. **Secret Key (for OAuth)**: paste the full contents of the `.p8` file — including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines.
5. **Team ID**: paste.
6. **Key ID**: paste.
7. **Save**.

### 3.5c. Test

Apple Sign In **does not work in Expo Go** — `expo-apple-authentication` is a native module that requires the Apple capability baked into the build. To test:

- **Quick path**: build a custom dev client via EAS: `eas build --profile development --platform ios`. Install on device via TestFlight or Ad Hoc. Then `npx expo start --dev-client` instead of plain Expo Go.
- **Skip-test path**: leave the wiring committed and verify after first TestFlight build (which has the entitlement automatically).

Until you do either, the login screen detects `AppleAuthentication.isAvailableAsync()` returns `false` in Expo Go and **hides the button** — email + password is the only path. So nothing's broken, the button just won't appear until you ship a real iOS build.

### 3.5d. Compliance check (per PLAN.md §C8)

- ✅ Apple Guideline 4.8 (Sign in with Apple required if any social login). Email magic link counts; we ship Apple alongside.
- ⚠️ Settings → Disconnect Apple ID flow not yet built — only matters if you use the FULL_NAME / EMAIL claims; we already request both. Track for v1.1.

---

## 4. Smaller loose ends (lower priority)

These aren't blockers but are noted in various docs:

- **Shelves Phase 2** — asset-gated. Drop your sprig PNGs + wood PNG into `assets/sprigs/` and `assets/shelves/`, then uncomment the source map in `src/components/shelves/Sprig.tsx` + `WoodShelf.tsx`. Then flip the plan's Phase 2 to in-progress + add the DB migration for `cover_color` / `cover_sprig`.
- **Tab bar icon swap** — emojis → `@expo/vector-icons` Feather set. ~15 min cosmetic polish.
- **BUG-010** — paper pattern in PDF export. Deferred since Phase F server renderer; documented on the ticket.
- **MVP integrations still missing** — RevenueCat, Google sign-in, magic-link sign-in, push notifications, MMKV, PostHog, Sentry, i18n, password reset. (Apple Sign In code landed 2026-04-25; awaits external setup per §3.5 above.) None blocking the north-star test but all promised in `PLAN.md`.

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
