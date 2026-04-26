# Handoff prompt — Spoon & Sketch

Paste everything between the fences into a fresh Claude Code session, or just say to a new instance: **"Read `.claude/handoff-prompt.md` and continue."**

```
You are picking up an in-progress build session for Spoon & Sketch. Read this whole prompt before doing anything else.

## What this app is (30 seconds)

A cozy iOS scrapbook cookbook for millennials. Two layers per recipe: structured data (ingredients, steps, times) + scrapbook decoration (stickers, washi tape, freehand drawings, photos). Primary use case is gifting — decorate a cookbook, add a handwritten dedication, order a real printed book via Lulu xPress. Emotional hook: "make Mom a cookbook for Mother's Day."

User is **Angy** (Anhelina Yermakova, ermakova.lina.lina@gmail.com). Solo developer. Today is **2026-04-25**.

## Read these in order

1. `CLAUDE.md` — project rules and 8 hard constraints. Most important: never put AI keys in client bundle, screens are thin, server data via TanStack Query (Zustand for UI only), keep living docs current with code in same commit, error boundaries everywhere.
2. `PLAN.md` — master plan, all phase rows, Pre-TestFlight P0/P1/P2/P3 compliance checklist. The §"Compliance & legal" section + the priority table at its bottom are the launch-readiness scoreboard.
3. `NEXT_STEPS.md` — Angy's personal action items (Apple Developer setup, vendor DPAs, etc).
4. `BUGS.md` — BUG-001 through BUG-026, all ✅ Fixed.
5. `MANUAL_TESTS.md` — phone test scenarios per feature.
6. `BACKEND.md` — every Edge Function spec (extract-recipe, auto-sticker, telegram-auth, import-recipes-json, moderate-image, delete-account, export-user-data).
7. `.claude/research/legal-compliance-research.md` — full UA/US/EU/Apple legal research; cited as authority for §C-section items in PLAN.md.
8. `FEATURES.md` — user-facing source of truth; update with every UI change.

## Working preferences (read carefully)

- **Solo project on `main`** — no PR workflow, no feature branches. Commit + push goes straight to canonical. Never force-push.
- **Plan mode for non-trivial work.** Multi-file changes, new schemas, or anything that touches the trust boundary (auth, consent, deletion, moderation) → enter plan mode, do exploration, write a plan, exit. Trivial fixes go direct.
- **Commit style:** terse subject + multi-paragraph body explaining WHY. End with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. Each commit covers one logical change.
- **Living docs in same commit as code change** — `BUGS.md` for bugs, `FEATURES.md` / `PLAN.md` / `MANUAL_TESTS.md` / `BACKEND.md` for features. Rule 8 in CLAUDE.md.
- **Don't over-explain in code.** Comments only for the WHY, never the WHAT. No multi-paragraph docstrings.
- **Don't spawn agents reflexively.** Only when scope is genuinely uncertain, or for parallel research. Use direct `find` / `grep` / `Read` for known targets.
- **Don't create planning/decision/analysis docs unless asked.** Work from conversation context. End-of-turn summary: 1-2 sentences max.
- **End-of-feature pattern:** after work has a natural follow-up (a one-time cleanup, a verify-after-soak, an external setup runbook), proactively offer to schedule a background agent or document it in NEXT_STEPS.

## Tech stack (memorize)

- **Framework:** Expo SDK 54 + TypeScript strict, Expo Router v6, **runs in Expo Go on iPhone via tunnel** — no Xcode required.
- **Network:** Angy is on `BELL807` Wi-Fi → MUST use `--tunnel` (LAN blocked by router). On other networks, prefer `--lan`. Always `--port 8082`.
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + Edge Functions), project ref `uvxkipafnzclvxtlhfqi`.
- **AI:** Anthropic Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), OpenAI gpt-image-1 (planned for stickers + watercolor).
- **Bot:** Telegraf.js + BullMQ + Upstash Redis (in-process fallback), runs locally for testing via `cd telegram-bot && npm run dev`. Username `@spoonsketch_bot`.
- **State:** TanStack Query v5 for server data, Zustand v5 for UI/canvas state.
- **Other:** RevenueCat (planned), Lulu xPress (planned), expo-clipboard, expo-image-picker, expo-image-manipulator, expo-document-picker, expo-sharing, expo-apple-authentication.

## Critical gotchas (don't relearn the hard way)

1. **Modern Supabase API keys (`sb_publishable_*` / `sb_secret_*`) are NOT JWTs.** Edge Function gateway rejects them. Every Edge Function we deploy MUST use `verify_jwt = false` in `supabase/config.toml` AND deploy with `--no-verify-jwt`. Function code does its own auth via `requireUser` (which accepts both formats) or `X-Spoon-Bot-Secret`. See BUG-022.
2. **Expo Go does NOT honor `LSApplicationQueriesSchemes` overrides** — `tg://` deep links return `canOpenURL=false` even when Telegram is installed. Use `https://t.me/...` Universal Links instead. See `app/(tabs)/me.tsx`.
3. **Apple Sign In requires a custom build (EAS dev client OR TestFlight)** — Expo Go doesn't ship the entitlement. Code is in `src/api/auth.ts` `signInWithApple()`; the login screen detects `isAvailableAsync()` and hides the button in Expo Go. See NEXT_STEPS.md §3.5 for the Apple Developer + Supabase Dashboard setup runbook.
4. **Cyrillic recipes need `max_tokens >= 4096`** — Russian/Ukrainian use ~3x more tokens than English. extract-recipe is set to 4096 (BUG-024).
5. **Multi-recipe URLs / PDFs / albums** — system prompt rule extracts ONLY the primary/first recipe. See BUG-025.
6. **JSON tab tolerates curly quotes** — ChatGPT smart-quotes its output. `previewJson` normalizes before `JSON.parse`. See BUG-026.
7. **AI consent gate (PLAN.md §C2)** — `extract-recipe` and `auto-sticker` Edge Functions reject with `403 consent_required` if `users.consent_ai = false`. Client banner in `app/recipe/import.tsx` warns the user when AI is off. JSON tab and Type tab don't need AI consent.
8. **CSAM moderation gate** — every photo upload (Photo tab AND Telegram bot) calls `moderate-image` Edge Function before generating signed URLs. Fails closed. PDF mode skipped (Anthropic does its own document moderation). See BACKEND.md.
9. **`telegram-screenshots` bucket has RLS** — clients can only write to their own folder. Bot uses service-role to bypass. See `supabase/migrations/20260425000001_telegram_screenshots_user_rls.sql`.
10. **Recipe deletion cascades** — every user-scoped table has `user_id … references public.users on delete cascade`. `delete-account` Edge Function calls `auth.admin.deleteUser` which cascades all the way down. Storage cleanup is manual (best-effort).
11. **Telegram bot runs as a separate Node service** — has its own `package.json` (excluded from root `tsc` via `tsconfig.json`). Has 2 pre-existing TS errors in `queue.ts:67,91` from BullMQ generic typing — not your code, ignore them.
12. **EU cookie consent banner** — first-launch bottom-sheet with reject-all parity. Persists per-device via Zustand+MMKV. PostHog (when added) MUST gate init on `useTrackingConsent.getState().status === 'accepted'`. Sentry treated as legitimate-interests / strictly-necessary, not gated.

## Recent commit chain (HEAD = `149718d`, 19 commits this session)

```
149718d EU cookie/analytics consent banner (ePrivacy gold standard)
78c485f PLAN: tighten phase tracker rows 10.8 + 10.9 to reflect landed work
29bee89 Data export — GDPR Art. 20 portability
3f2d111 In-app account deletion (Apple 5.1.1(v) + GDPR Art. 17 + UA PDP)
21fd152 Granular consent UI + server gate
f10c16e Image moderation gate (Apple Guideline 1.2 + NCMEC compliance)
3549bf7 Sign in with Apple — code wiring + runbook
6d0de52 PLAN: rewrite compliance section with full UA + US + EU + Apple coverage
d3e2b91 PLAN: add Ukraine launch compliance + legal (Phase 10.9)
75123cd PLAN: add 4 missing account-management surfaces as launch blockers
821bc5a PLAN: add onboarding flow as launch blocker (Phase 10.7)
8c78bd1 JSON tab: tolerate smart quotes in pasted AI output (BUG-026)
03a125f Wire 6 cookbook-spine sprig PNGs (Shelves Phase 2)
10a3979 JSON bulk-import tab + multi-recipe URL fix (BUG-025)
d42681e Photo + File import tabs — finish the 4-tab Import flow
052eda3 Edit + delete recipe from Clean view
4e01554 Phase 8.5 Phase 1: multi-image album import + i18n fixes
2d7c264 Phase 8 connect-flow: bot Edge Function gateway fix + UX polish
1e17ed1 docs: rename bot to spoonsketch_bot, add Phase 8.5 roadmap
31267c6 tsconfig: exclude telegram-bot from app type-check
```

## What's done (high level)

- Phase 8 Telegram bot end-to-end (connect via deep link, recipe URL + photo + album import)
- All 5 Import tabs: Paste / Type / Photo / File (PDF + .txt) / JSON
- Edit + Delete recipe from Clean view
- Sprig PNGs on cookbook shelves (Phase 1 of shelves redesign)
- Compliance engineering pieces: Sign in with Apple (code), CSAM moderation, granular consent UI + server gate, in-app account deletion, GDPR data export, EU cookie consent banner

## What's pending — engineering, prioritized

1. **Order history** (`/me/orders`) — PLAN.md §17. Reverse-chrono list of `print_orders` rows with status + tracking. ~3h.
2. **Manage Subscription** (`/me/subscription`) — §18. Includes Restore Purchases. Gated on RevenueCat install, but the screen layout + Restore button can land first. ~2h.
3. **Email change / recovery** — §20. Magic-link verification on new email. ~3h.
4. **In-app "Report content" button** — Apple 1.2 + DSA-readiness. ~1h.
5. **Sticker pack expansion** (Phase 8.5A) — gated on Angy's OpenAI key + ~$3-6 in image gen. ~6h.
6. **Photos / Frames / Watercolor** (Phase 8.5B-E) — bigger feature; the detailed plan was overwritten in the plan file but PLAN.md Phase 8.5 row + summary preserved.
7. **Onboarding screens** (Phase 10.7) — gated on marketing.

## What's pending — non-engineering (Angy's court)

- Lawyer-drafted Privacy Policy + Terms of Service (EN + UK) per §C1 + the legal-research checklist
- Vendor DPAs sign-off (Anthropic ZDR verify, OpenAI, Supabase, RevenueCat, Stripe, Lulu, PostHog, Sentry, Railway) per §C4
- Apple Developer portal + Supabase Dashboard for Apple Sign In (NEXT_STEPS.md §3.5)
- EU Representative contract (~€500-2000/year)
- App Store Connect privacy nutrition labels + age rating + Privacy Policy URL
- Ombudsman filing (Ukraine DPA notification)
- RoPA spreadsheet
- Rotate Anthropic API key + Telegram shared secret leaked in `~/.zsh_history`

## Common commands

```bash
# Run app on Angy's iPhone (BELL807 → tunnel required, port 8082 always)
npx expo start --tunnel --port 8082
# QR for the iPhone Camera app — LAN mode prints no QR; build manually:
npx --yes qrcode "exp://..." -o /tmp/expo-qr.png && open /tmp/expo-qr.png
# (For LAN: exp://$(ipconfig getifaddr en0):8082 — only works on non-BELL807)

# Type-check (root + bot — bot has 2 pre-existing BullMQ errors, ignore)
npx tsc --noEmit
cd telegram-bot && npx tsc --noEmit

# Run the Telegram bot locally
cd telegram-bot && npm install && npm run dev
# Expect: [queue] in-process worker ready (no Redis)
# (Bot doesn't print [bot] launched — Telegraf v4 quirk; check process is alive instead)

# Deploy an Edge Function (always with --no-verify-jwt for our project's gateway)
supabase functions deploy <name> --no-verify-jwt

# Apply pending migrations
echo y | supabase db push

# Verify Supabase secrets (just lists names + digests, no values)
supabase secrets list

# Test extract-recipe directly (for debugging)
# Use the dashboard for logs: https://supabase.com/dashboard/project/uvxkipafnzclvxtlhfqi/functions/<name>/logs
```

## Auto-memory pointer

Auto-memory lives at `/Users/angy/.claude/projects/-Users-angy-spoonsketch/memory/`. Index: `MEMORY.md`. Currently has:
- `project_state.md` — phases done summary (older, may be stale)
- `feedback_dev_environment.md` — Expo Go + tunnel setup
- `project_secrets_layout.md` — where each secret lives (.env / telegram-bot/.env / Supabase secrets)

Update memory when you learn new user preferences or non-derivable facts. Don't save anything derivable from current code or git history.

## First things to do in a new session

1. `git status` — confirm clean working tree.
2. `git log --oneline -10` — verify HEAD is `149718d` "EU cookie/analytics consent banner".
3. Read `PLAN.md` §"Compliance & legal" + the P0/P1/P2/P3 priority table at its bottom — that's the launch-readiness scoreboard.
4. Read `NEXT_STEPS.md` for any Angy-side actions that may have completed since.
5. Ask Angy what's next, or propose from the "What's pending — engineering" list above.
```

---

That's the prompt. Save it, paste it into a fresh session, and the new instance will have full context to keep going.
