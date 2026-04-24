# Continuation prompt

Paste the block below into a fresh Claude session (claude.ai/code on mobile Safari, or any Claude surface connected to this repo). It's self-contained — a new session doesn't have our prior conversation context, so the docs below carry all the state.

---

```
I'm continuing work on Spoon & Sketch. Read these in order before doing anything:

1. CLAUDE.md                                          — project rules + "Running the app on the user's iPhone"
2. .claude/plans/phase-8-telegram-bot.md              — ACTIVE plan (8.0 + 8.1 + 8.2 + 8.3 + 8.4 shipped; 8.5 polish + Redis switch remain)
3. telegram-bot/README.md                             — bot service docs incl. "Switch to Redis-backed queue" section (deferred step)
4. .claude/plans/shelves-redesign.md                  — Phase 1 shipped; Phase 2 still asset-gated on sprig PNGs + wood PNG
5. .claude/plans/book-templates-paper-atomization.md  — done
6. BUGS.md                                            — canonical bug register
7. MANUAL_TESTS.md                                    — manual regression scenarios
8. PLAN.md                                            — master phase tracker

## What's shipped on main (most recent first)

- 6226434  Bot username default → spoonsketch_bot
- 9b87b79  Fix Connect Telegram crypto polyfill (expo-crypto)
- 8fea3a9  Phase 8.2: Telegram bot service (Telegraf + BullMQ + Upstash) + bot-mode auth on extract-recipe
- 29e863b  Phase 8.3 + 8.4: Connect Telegram UI + recipes realtime
- e133fba  Phase 8.0 + 8.1: image_extract path + telegram-auth bridge
- dd6800b  BUG-021: PDF body font follows recipe's font preset
- f906a91  BUG-019 follow-up: dots + step badges as inline SVG
- fd206f0  BUG-020: text-heavy blocks grow when font bumped
- 720bdf4  BUG-019: PDF↔preview gap (fonts, stickers, pills, bg, corner)
- d94fc82  Shelves redesign Phase 1: books on wooden shelves

## Where Phase 8 is at

Code-complete for 8.0–8.4. All client-side + Edge-Function-side pieces shipped.

**Still pending on the user's side to actually see the bot respond:**

1. Bot service needs to be running somewhere. Two options in the repo:
   a. Local dev: `cd telegram-bot && cp .env.example .env`, fill in the 4–5 env vars, `npm install && npm run dev`. Runs as long as the terminal is open. Works in no-Redis fallback mode (in-process queue, no retries, fine for smoke test).
   b. Production: Railway deploy. `railway.json` + README.md has the steps.

2. **Redis switch is deferred.** The bot currently boots fine without REDIS_URL — src/queue.ts falls back to an in-process queue and prints a loud warning. Before production:
   - Sign up at upstash.com (free tier)
   - Create a Redis DB
   - Paste the rediss:// URL into both local .env and Railway Variables
   - No code change — queue.ts autodetects and switches to BullMQ.
   - Full steps in telegram-bot/README.md §"Switch to Redis-backed queue".

3. 8.5 polish: MANUAL_TESTS.md Phase 8 scenarios still need to be written (full list in the plan). FEATURES.md / BACKEND.md still need cross-reference updates for the new tables.

**If the user asks to "continue Phase 8" or "finish the telegram bot":**
- First check whether the bot is currently deployed (ask them, or run `git log` for bot-related commits after 8fea3a9).
- If not: help them complete the Redis switch + Railway deploy OR verify local `npm run dev` boots cleanly.
- If yes: run the Phase 8.5 polish (test scenarios, doc updates) and close out the plan.

## Other open work (lower priority)

- **Shelves Phase 2** — asset-gated on user-provided PNGs (sprigs + wood plank). Uncomment the SPRIG_SOURCES map in src/components/shelves/Sprig.tsx and WOOD_SOURCE in WoodShelf.tsx once they drop files into assets/.
- **Tab bar icon swap** — emojis → @expo/vector-icons Feather set. ~15 min cosmetic polish.
- **BUG-010** (paper pattern in PDF) — still deferred; documented on the ticket.
- **MVP integrations still missing** — RevenueCat, Apple/Google/magic-link sign-in, push notifications, MMKV, PostHog, Sentry, i18n, password reset.

## Ground rules from CLAUDE.md

- Screens thin; src/api/ pure; server data in TanStack Query only; Zustand is UI-only.
- Anthropic key never in the client bundle.
- TypeScript strict, no `any`.
- Error boundaries on every tab root + editor (already applied via `withErrorBoundary` HOC).
- Don't use emojis in code unless explicitly asked.
- Keep living docs current: BUGS.md + MANUAL_TESTS.md + the active plan file. Rule #8 in CLAUDE.md.

## How I work

- Terse updates, not essays.
- New bug → add BUG-NNN row to BUGS.md using existing entries as template.
- New manual-test scenario → MANUAL_TESTS.md under the matching phase.
- Don't commit without me asking.
- When I say "do it" / "keep going", proceed without confirming each step.

Start by: tell me in 2 sentences what state the project is in and what the smallest thing I can ship next would be.
```

---

## How to use from the phone

1. Copy the block inside the fenced code above.
2. On your phone, open claude.ai/code (Safari) or whichever Claude surface is connected to the `spoonsketch` repo.
3. New session → paste → send.

## When you're back at the Mac

Pick up from whatever the mobile session did by reading `git log` since `6226434` + the plan + bug log. The docs are the source of truth for state.
