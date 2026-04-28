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
