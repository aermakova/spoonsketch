# Vacation runbook — fully iPad-independent (Mac OFF for ~3 weeks)

Date written: 2026-04-28. Cache this on iPad via Working Copy so it's readable offline.

**Working assumption:** your Mac is **shut down at home** for the whole vacation. Nothing on the Mac is reachable. Every tool, file, and service must live in the cloud or on iPad.

---

## TL;DR

Everything you need lives in **three clouds**:

| Cloud | What's there | Free? |
|---|---|---|
| **GitHub** | Code repo + Codespaces (cloud Linux dev env w/ VS Code in browser) | 60 h/mo free, then $0.18/h |
| **Expo / EAS** | iOS build service, project metadata, build history | Free for personal use |
| **Apple TestFlight** | Builds installed on your iPhone | Free with $99/y Apple Dev account |

Plus three iPad apps: **Tailscale (skip)**, **Blink Shell (skip — no Mac to SSH to)**, **Working Copy (yes, for offline)**, **TestFlight (yes)**.

You don't need Mac. You don't need SSH. You don't need Tailscale.

---

## § Master launch-readiness table — everything left before the app is ready

Sorted by gate. **iPad?** column tells you what you can knock off mid-vacation vs what has to wait.

Legend: 🔴 blocker · 🟡 in progress · ⬜ not started · ✅ done.
**T** = TestFlight build · **P** = public App Store launch · **—** = not blocking.

### 1. Pre-TestFlight gates (you've already shipped one — these apply to the next build)

| # | What | Status | Owner | Time | iPad? | Notes |
|---|---|---|---|---|---|---|
| 1 | Apple Developer Program — $99/y, account verified | 🟡 / ✅ if TF build cleared | You | 24h verify | Yes (developer.apple.com on Safari) | If TF build cleared, this is done. |
| 2 | App Store Connect — bundle ID + app record | 🟡 / ✅ if TF build cleared | You | 5 min | Yes (appstoreconnect.apple.com) | Same as above. |
| 3 | **Sign in with Apple — external setup** (Apple Dev portal Service ID + Key + Supabase Auth provider config) | ⬜ | You | 30 min | Yes (developer.apple.com + supabase.com) | Runbook in `NEXT_STEPS.md` §3.5. The Apple button is hidden in builds until this lands. **Required for TestFlight Apple-Sign-In to work.** |
| 4 | **Supabase Auth Redirect URLs** — add `spoonsketch://auth/callback` and `spoonsketch://auth/reset` | ⬜ | You | 2 min | Yes (Supabase Dashboard) | Magic-link + password-reset deep links break without these. |
| 5 | **Sticker registry update** — wire 17 new packs into `src/lib/stickerRegistry.ts` + auto-sticker Edge Function | ⬜ | Me (Claude) | 30 min | Yes (Codespaces) | Without this, the new sticker PNGs you generated won't appear in the app. |
| 6 | EAS auto-managed credentials (one-time) | ✅ if TF build cleared | You | — | — | EAS handles this automatically the first time. |
| 7 | Push the latest code to GitHub | 🔴 critical pre-vacation | You | 1 min | — | `git push origin main` on Mac before turning it off. |

### 2. Pre-public-launch (App Store submission) — Apple P0 blockers

These are non-negotiable for the public App Store. Apple rejects apps missing any of these.

| # | What | Status | Owner | Time | iPad? | PLAN ref |
|---|---|---|---|---|---|---|
| 8 | Privacy Policy at stable URL (EN + UK), linked in App Store Connect | ⬜ | Lawyer + you | weeks | Partial — drafting Yes; lawyer review No | §C1 |
| 9 | Terms of Service at stable URL (EN + UK) | ⬜ | Lawyer + you | weeks | Partial | §C1 |
| 10 | App Store Connect Privacy Nutrition Labels — accurate per actual data flows | ⬜ | You | 30 min | Yes (App Store Connect web) | §C8 |
| 11 | Age rating questionnaire — UGC = Yes (recipes are user content) | ⬜ | You | 5 min | Yes | §C8 |
| 12 | Demo account credentials in App Review Notes | ⬜ | You | 5 min | Yes | §C8 |
| 13 | Print orders confirmed as **physical goods** in App Review Notes (NOT in-app purchase) | ⬜ | You | 5 min | Yes | §C8 — gated on Lulu integration first |
| 14 | RevenueCat — IAP install + tier UI + Restore Purchases on paywall + Settings | ⬜ | Me (Claude) + you | ~half day code + RevenueCat account | Yes (Codespaces + revenuecat.com) | P0 #3 |
| 15 | Subscription disclosure copy adjacent to Subscribe button | ⬜ | Me (Claude) | ~1h, blocked on #14 | Yes | §C6 + §16 |
| 16 | App Store screenshots (5+, real device or mockups) | ⬜ | You + designer | 1-2 days | Partial — design Yes; capturing screenshots from real device No | §C8 |
| 17 | App Store description + keywords + support URL + marketing URL | ⬜ | You | 1h | Yes | §C8 |
| 18 | App icon at 1024×1024 PNG | ⬜ / verify if exists | You | 5 min if exists | Yes (upload via App Store Connect) | §C8 |

### 3. Pre-public-launch — P1 legal / GDPR / California / Apple

Less likely to block submission outright, but enforcement risk if missing post-launch.

| # | What | Status | Owner | Time | iPad? | PLAN ref |
|---|---|---|---|---|---|---|
| 19 | EU Representative contract (required if shipping to EU) | ⬜ | You + EU vendor | days | Partial — research/sign-up Yes; in-person No | §C7 |
| 20 | DPAs signed with all data-processing vendors: **Anthropic, Supabase, OpenAI, Apple, Expo, RevenueCat, Lulu, Railway, Upstash, PostHog (when wired), Sentry (when wired)** | ⬜ | You | hours per vendor | Yes (most are click-through DPAs in their dashboards) | §C4 |
| 21 | California ARL — auto-renewal disclosure copy in subscription UI | ⬜ | Me (Claude) | 2h, blocked on RevenueCat | Yes | §C6 |
| 22 | COPPA age gate at registration ("I am 13+" checkbox) | ⬜ | Me (Claude) | 1h | Yes | §C6 |
| 23 | Privacy Policy translated to Ukrainian (UA PDP Law) | ⬜ | Translator | days | Partial — coordinate Yes; final review No | §C1 |
| 24 | Per-purpose consent checkboxes (engineering ✅, copy review pending) | 🟡 | You | 1h legal review | Yes | §C2 |
| 25 | RoPA — Records of Processing Activities document | ⬜ | You + lawyer template | 2-3h | Yes (write in any markdown) | §C9 |
| 26 | 72-hour breach notification runbook | ⬜ | You | 2h | Yes | §C9 |
| 27 | "Report content" button on recipe detail (UGC moderation) | ⬜ | Me (Claude) | 2h | Yes | §C7 + §C8 + §C9 |
| 28 | Stripe Tax wired for US print-order checkout | ⬜ | Me (Claude) | half day, blocked on Lulu + Stripe accounts | Yes | §C9 |

### 4. Code work still pending (feature parity with marketing brief)

| # | What | Status | Owner | Time | iPad? | PLAN ref |
|---|---|---|---|---|---|---|
| 29 | Sticker registry update for 17 packs | ⬜ | Me | 30 min | Yes | line above (#5 in TestFlight section) |
| 30 | Telegram bot → Railway production deploy | ⬜ | You | 30 min, $5/mo | Yes (railway.app) | `NEXT_STEPS.md` §3 |
| 31 | Onboarding GIFs — drop 5 into `assets/onboarding/` + replace `<HeroSlot caption=…>` lines | ⬜ | You + me | 5 min | Yes (Working Copy + Codespaces) | Phase 10.7 |
| 32 | RevenueCat install (see #14 above) | ⬜ | Me + you | half day | Yes | §18 |
| 33 | Lulu xPress integration (Phase 9) — print order flow + Phase F server-side PDF renderer | ⬜ | Me + you | 2-3 days + Lulu account | Yes (Codespaces + lulu.com) | Phase 9, BUG-010 |
| 34 | Order history surface (§17) | ⬜ | Me | 1 day, blocked on Lulu | Yes | §17, P0 #13 |
| 35 | Phase 8.5B–E — recipe photo upload + 8 frames + watercolor (OpenAI) + PDF catch-up | ⬜ | Me + you | ~32h | Yes (Codespaces + OpenAI key) | Phase 8.5 |
| 36 | Push notifications — `expo-notifications` wire-up | ⬜ | Me | 1 day | Yes | Phase 11 |
| 37 | Google Sign-In | ⬜ | Me + you | 1 day + Google Cloud account | Yes | §C8 |
| 38 | Tab bar icon swap (emojis → Feather icons) ✅ | ✅ done 2026-04-26 | — | — | — | — |
| 39 | i18n full Ukrainian translations (engineering scaffolded ✅) | 🟡 | You + translator | days | Partial | §C1 |

### 5. Observability accounts (no-ops without keys)

| # | What | Status | Owner | Time | iPad? | Notes |
|---|---|---|---|---|---|---|
| 40 | PostHog account → set `EXPO_PUBLIC_POSTHOG_KEY` in Codespace Secrets + `.env` | ⬜ | You | 5 min | Yes (posthog.com) | All instrumentation already wired (commit `fb98859`) — flips on the moment the key lands. |
| 41 | Sentry account → set `EXPO_PUBLIC_SENTRY_DSN` | ⬜ | You | 5 min | Yes (sentry.io) | ErrorBoundary already pipes to Sentry. |

### 6. Polish / nice-to-have (not blockers)

| # | What | Status | Owner | Time | iPad? |
|---|---|---|---|---|---|
| 42 | Custom drawing colour picker (more colours + wheel) ✅ | ✅ done 2026-04-26 | — | — | — |
| 43 | Apple Pencil pressure ✅ | ✅ done 2026-04-26 | — | — | — |
| 44 | Cook Mode ✅ | ✅ done 2026-04-26 | — | — | — |
| 45 | App Preview video (optional but boosts conversion) | ⬜ | You + designer | days | No |
| 46 | North-star test (install → recipe → decorate → PDF in <5 min) | ⬜ | You | 30 min once everything ships | Yes — test on iPhone |
| 47 | Device regression test on iPad + multiple iPhone models | ⬜ | You | hours | Partial |

### 7. Post-launch / scale (P2, P3)

| # | What | When | iPad? | PLAN ref |
|---|---|---|---|---|
| 48 | ATT prompt decision after PostHog audit | post-launch | Yes | §C6 + §C8 |
| 49 | Stripe Tax (#28) — required at scale | when print orders exceed Stripe Tax threshold | Yes | §C9 |
| 50 | EAA WCAG 2.1 AA audit | when crossing micro-enterprise threshold | Yes (audit), No (testing) | §C9 |
| 51 | Ukrainian Ombudsman DPA notification | within 30 days of launching to Ukrainian users | Yes (filing) | §C3 |
| 52 | Transfer Impact Assessments (TIAs) for Anthropic + OpenAI | post-launch documentation | Yes | §C9 |

---

### What this means for your vacation realistically

- **From iPad alone, you can ship**: items 3, 4, 5 (asks me), 16, 17, 30, 31, 40, 41, plus any code work I pick up. Roughly **a week's worth of progress is genuinely doable from a hammock** with good WiFi and 2h/day.
- **You CAN'T ship from iPad**: lawyer-drafted docs (8, 9, 25), in-person tasks (47 device regression), real screenshots without a phone in hand (16 partial), translations (23, 39).
- **Critical path right now** to get the app actually shippable to the public App Store: items **3, 4, 5** (TestFlight Apple-Sign-In + sticker registry — all small) → then **14 RevenueCat** → then **8, 9 lawyer docs** in parallel → then **16, 17 store assets** → then **submit**.

If you do **3, 4, 5 in the airport** + drop me items **14 (RevenueCat) and 30 (Railway) on day 1 of vacation**, you'd land 80% of the remaining engineering work over the trip.

---

## § Critical pre-departure checklist (DO BEFORE TURNING MAC OFF)

These are one-time actions that **must** happen on Mac. Once Mac is off, they're impossible.

### 1. Push everything to GitHub
```bash
cd ~/spoonsketch
git status     # must be clean (no uncommitted changes)
git push origin main
```
Verify on github.com/aermakova/spoonsketch that the latest commit shows.

### 2. Move secrets out of `.env` files into GitHub Codespace Secrets

Your Mac's `.env` and `telegram-bot/.env` won't follow you. Get them into the cloud now.

Open in browser: **github.com/aermakova/spoonsketch → Settings → Secrets and variables → Codespaces → "New repository secret"**.

Add these (copy values from your local `.env` files):

| Name | Value source |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` |
| `EXPO_PUBLIC_TELEGRAM_BOT_USERNAME` | `.env` |
| `OPENAI_API_KEY` | wherever you stored it (only needed if running sticker generator from iPad) |
| `EXPO_TOKEN` | get from expo.dev → Account Settings → Access Tokens → Create Token |
| `EAS_BUILD_AUTOSUBMIT` | optional, set to `1` |

After this, every Codespace you create auto-injects them into the env. No more local `.env` headaches.

### 3. Cut a TestFlight build NOW

While you have Mac access, get your app onto your iPhone via TestFlight so it works even when no Codespace is running.

```bash
# On Mac:
npm install -g eas-cli
eas login                    # OAuth into your Expo account
eas build:configure          # generates eas.json (writes one if missing — say yes to defaults)
eas build --platform ios --profile production --auto-submit
```

Wait ~10-15 min for build. Apple TestFlight review: ~15 min for incremental builds, **~24 hours for the very first build**.

**Important**: the first build is the slow one. Submit it **at least 48h before vacation** so it's cleared and on your phone before you leave.

After it's cleared, on your iPhone: open TestFlight → install the build. The app is now on your phone, **no laptop needed for it to work** at all.

### 4. Save your secrets in 1Password / Notes / paper backup

Belt-and-suspenders in case GitHub Secrets has an outage. Copy-paste these somewhere your iPad can see:

- Supabase URL + anon key
- Telegram bot token
- OpenAI key
- Expo auth token (from expo.dev)
- App Store Connect credentials

### 5. Telegram bot decision

The bot currently runs on your Mac (`cd telegram-bot && npm run dev`). If Mac is off, **bot is dead** for 3 weeks unless you deploy it.

**Either:**
- **(Recommended) Deploy to Railway** before leaving (~30 min, $5/mo, follow `NEXT_STEPS.md` §3). Bot keeps working.
- **Or accept** that Telegram-bot recipe imports won't work for 3 weeks. URL/Photo/File/JSON imports inside the app keep working — only the bot intake stops.

### 6. Push your `.env.example` if not already

Codespaces will create from this template. Verify the example file exists in the repo:

```bash
ls .env.example
```

If missing, copy your `.env`, redact secrets, and commit:

```bash
sed 's/=.*/=/' .env > .env.example
git add .env.example && git commit -m "chore: add .env template" && git push
```

### 7. Final smoke test from iPad while still on home WiFi

Before turning the Mac off, confirm the iPad path actually works:

1. On iPad Safari → github.com/aermakova/spoonsketch → "Code" → "Codespaces" → "Create codespace on main"
2. Wait ~30s for it to build
3. Open the integrated terminal
4. Verify env: `echo $EXPO_PUBLIC_SUPABASE_URL` (should show your URL)
5. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
6. Run: `claude` and complete the OAuth (one tab opens, sign in, paste code back)
7. You should now be in a Claude Code session in the Codespace
8. Stop the Codespace from the gear menu (don't delete — you can reopen it on the plane)

If all 8 worked, you're cleared to turn off Mac.

---

## § iPad apps to install (5 min)

| App | Cost | Why |
|---|---|---|
| **Working Copy** | $20 (one-time) | Git client + offline editor. Your insurance for "no internet" moments. |
| **TestFlight** | Free | Install builds Apple has cleared. |
| **(Optional) Textastic** | $10 | Better code editor; pairs with Working Copy via the Files app. |
| **(Optional) Mobile data SIM/eSIM for the country you're visiting** | varies | Reliable internet wherever you go. Better than hotel WiFi. |

**Apps you do NOT need (since Mac is off):**
- ~~Tailscale~~ — only matters if SSH'ing to a home machine
- ~~Blink Shell~~ — Codespaces has its own browser-based terminal

---

## § Daily flow on vacation

### Online (most of the time)

1. Open Safari on iPad
2. Go to **github.com/codespaces** → click your existing codespace ("spoonsketch / main")
3. Wait ~10s for it to wake up
4. Open terminal panel (Cmd-` if you have a Bluetooth keyboard, or click the menu)
5. Run `claude` → start where you left off

### Resuming Claude conversations across Codespaces

Codespaces preserves the file system between sessions but **Claude sessions are local to each Codespace**. To resume the most recent conversation in a given Codespace:

```bash
claude --continue
```

To pick from a list of past sessions:

```bash
claude --resume
```

If a Codespace is deleted (auto-deletes after 30 days idle, or manually), all sessions in it are lost. **Keep one persistent codespace** for the whole vacation; don't delete it.

### When you finish working for the day

Click the green "Codespaces" indicator at the bottom-left of VS Code → "Stop Current Codespace". This stops billing immediately. Your files persist.

The codespace also auto-suspends after **30 min idle**. Resuming takes ~10s.

### Offline (plane, no WiFi)

Open **Working Copy** on iPad → spoonsketch repo → edit files in the built-in editor. Commit locally. When WiFi returns, tap "Push".

You can read all `.md` docs (CLAUDE.md, PLAN.md, NEXT_STEPS.md, this runbook) offline.

---

## § Triggering an EAS build from iPad

You did one before leaving. To cut a new one mid-vacation:

### Method A — From Codespaces terminal

```bash
# In your codespace (one-time per codespace):
npm install -g eas-cli

# Then:
eas build --platform ios --profile production --auto-submit
```

The build runs on Expo's cloud (NOT on your iPad). Takes ~15 min. Auto-submit pushes to TestFlight. Apple review (~15 min for incremental builds). Email arrives. Open TestFlight on iPhone → install.

### Method B — From expo.dev in Safari (no terminal)

1. Safari → expo.dev → log in
2. Click your project → "Build" tab → "Build" button → fill out the form → submit
3. Watch progress on the dashboard
4. TestFlight app on phone notifies when ready

---

## § Watching costs

- **Codespaces**: 60 h/mo free for personal accounts. Past that, $0.18/h on a 2-core machine. **Three weeks of ~2 h/day = ~42 h = under the free tier.** If you forget to stop one and it runs for a week, that's ~$30. Set a calendar reminder to "check codespace status" weekly.
- **EAS Build**: free for personal projects (within fair-use limits — you'd have to build many times daily to hit them).
- **OpenAI**: only charges if you run the sticker generator. Not part of normal app development.
- **Anthropic / Claude**: covered by your subscription if signed in via OAuth.

---

## § What to do when something breaks

### Codespace won't start / network error
- Try a different network (cellular hotspot from iPhone)
- github.com/status — check for outages
- If a codespace is stuck, delete it and create a new one (you'll re-install Claude Code; ~30 sec)

### Claude says "session expired"
```bash
claude logout
claude     # OAuth flow again
```

### EAS build fails
- Check `eas.json` for the profile name (`production` is what we set)
- Check expo.dev → your project → Build logs for the actual error
- Most common: Apple Developer signing issue. EAS managed credentials usually fixes itself; if not, run `eas credentials` interactively

### TestFlight build doesn't show on iPhone
- Apple review takes ~15 min for incremental builds, longer for first build
- Check TestFlight email
- Ensure your Apple ID on the iPhone matches the Apple Developer account that submitted

### "I locked myself out of my Codespace and lost everything"
You haven't. Files are committed to GitHub. Worst case: create a fresh codespace, `git pull`, re-install `claude`, resume. ~5 min.

---

## § Quick command reference

```bash
# Connect (browser only — no terminal needed)
# → github.com/codespaces → click your codespace

# Once in codespace terminal:
npm install -g @anthropic-ai/claude-code   # one-time per codespace
claude --continue                          # resume most recent session
claude --resume                            # pick from past sessions
claude                                     # fresh session

# Pull other-machine commits (if you push from a friend's laptop, etc.)
git pull origin main

# Push your work
git add -A && git commit -m "..." && git push

# Trigger TestFlight build (after one-time eas setup)
npm install -g eas-cli                     # one-time per codespace
eas build --platform ios --profile production --auto-submit

# Check build status
eas build:list

# Stop the codespace (saves money)
# → Bottom-left "Codespaces" indicator → "Stop Current Codespace"
```

---

## § Pre-departure checklist (print this)

**Mac (last time you'll touch it for 3 weeks):**
- [ ] `git push origin main` — repo is clean and pushed
- [ ] All secrets copied to GitHub Codespace Secrets (§ step 2)
- [ ] All secrets backed up in 1Password / Notes / paper (§ step 4)
- [ ] First TestFlight build cut + submitted ≥ 48h ago, cleared by Apple
- [ ] TestFlight build installed on iPhone
- [ ] Telegram bot deployed to Railway (or accepted that bot is offline for 3 weeks)
- [ ] Codespace creation tested from iPad on home WiFi (§ step 7)
- [ ] `claude` runs in the Codespace
- [ ] Mac can be turned off

**iPad:**
- [ ] Working Copy installed + spoonsketch cloned
- [ ] TestFlight installed
- [ ] You can find this runbook in Working Copy (`.claude/VACATION_RUNBOOK.md`) for offline reading

**Apple / Expo accounts:**
- [ ] Apple Developer Program: active
- [ ] App Store Connect: app record created with bundle ID `com.spoonsketch.app`
- [ ] expo.dev: account active, project linked

If every box is ticked, **you're independent of Mac for the whole vacation**. Turn it off, enjoy.

---

## § One thing I can't fix from iPad: secrets that aren't in Codespace Secrets

If you forget to set a secret before leaving, you can still add it on the fly:

1. Safari → github.com/aermakova/spoonsketch → Settings → Secrets and variables → Codespaces
2. Add the secret
3. **Reload the codespace** (you must rebuild for the new secret to inject — kebab menu → Rebuild Codespace)

It's a 2-min fix, but easy to forget. Get them all in before leaving.

---

*Cached for offline reading. If you're seeing this on a plane: you're prepared. Open Working Copy + start typing.*
