# Next steps when you're back at the laptop

Everything below assumes you're in the repo root on `main`. This session wrote code only — nothing was committed, nothing was deployed, no secrets were set.

---

## 1. Review what changed (5 min)

```bash
git status
git diff --stat
```

Expected: a bunch of new files under `supabase/functions/`, `src/components/import/`, `app/recipe/import.tsx`, `app/upgrade.tsx`, `docs/edge-functions.md`, and edits to `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/recipe/create.tsx`, `FEATURES.md`, `MANUAL_TESTS.md`, `BACKEND.md`, `tsconfig.json`, `.gitignore`.

Also new: this file and `.claude/plans/phase-7-ai-features.md` (the active plan).

Read the plan first:
```bash
open .claude/plans/phase-7-ai-features.md
```

---

## 2. Install the Supabase CLI (one-time)

```bash
brew install supabase/tap/supabase
```

Verify:
```bash
supabase --version
```

---

## 3. Link the repo to your Supabase project (one-time)

Get your project ref from the Supabase dashboard URL: `https://supabase.com/dashboard/project/<ref>` — the `<ref>` is the slug in the URL.

```bash
supabase link --project-ref <your-project-ref>
```

This writes a `.temp/` directory (already gitignored).

You also need to edit `supabase/config.toml` and set `project_id = "<your-project-ref>"` (I left it as `"spoonsketch"` as a placeholder).

---

## 4. Set the Anthropic secret (one-time per project)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Optional: create `supabase/.env.local` (already gitignored) for local `supabase functions serve` runs:
```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' > supabase/.env.local
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the Supabase platform at runtime — you don't set them.

---

## 5. Deploy the Edge Functions

```bash
supabase functions deploy extract-recipe
supabase functions deploy auto-sticker
```

Sanity-check with curl after you have a user JWT:
```bash
# Grab a JWT from the app (inspect a logged-in session in Expo Go) or via supabase-js in a REPL.
JWT="..."

# Test extract-recipe
curl -i -X POST "https://<your-ref>.supabase.co/functions/v1/extract-recipe" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.bbcgoodfood.com/recipes/tomato-soup"}'

# Test auto-sticker (use any real recipe UUID you own)
curl -i -X POST "https://<your-ref>.supabase.co/functions/v1/auto-sticker" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"recipe_id":"<recipe-uuid>"}'
```

Expected:
- `extract-recipe`: 200 JSON with `title`, `ingredients`, etc.
- `auto-sticker`: 200 JSON `{ elements: [{ sticker_key, x_frac, y_frac, rotation, scale, z_index_offset, reasoning }] }` with 3–5 entries.

Tail logs live:
```bash
supabase functions logs extract-recipe --project-ref <ref>
supabase functions logs auto-sticker --project-ref <ref>
```

---

## 6. Run the app on your iPhone

Per `CLAUDE.md § "Running the app on the user's iPhone"`:

```bash
# On any wifi that isn't BELL807:
npx expo start --lan --port 8082
npx --yes qrcode "exp://$(ipconfig getifaddr en0):8082" -o /tmp/expo-qr.png && open /tmp/expo-qr.png

# On BELL807 (client isolation on):
npx expo start --tunnel --port 8082
# The tunnel URL will print; build a QR from that.
```

Scan with iPhone Camera app → opens Expo Go.

---

## 7. Run the Phase 7 manual test scenarios

Two sections in `MANUAL_TESTS.md`:
- `"Phase 7.1 — AI recipe import from URL"` — 13 scenarios
- `"Phase 7.2 — Make me Sketch (auto-sticker)"` — 13 scenarios

Walk each top to bottom. Log bugs as new rows in `BUGS.md` (template in existing BUG-0xx rows).

---

## 8. Commit checkpoint — both 7.1 and 7.2 landed together

Phase 7.1 + 7.2 + 7.3 were coded in a single session with no commit between. Suggested single commit once device-green, or split into two if you prefer:

### Option A — single commit (recommended: they share infra)

```bash
git add supabase/functions supabase/config.toml \
  src/api/ai.ts src/types/ai.ts \
  src/hooks/useExtractRecipe.ts src/hooks/useAutoSticker.ts \
  src/components/import \
  src/components/canvas/MakeMeSketchButton.tsx \
  src/lib/canvasStore.ts \
  app/recipe/import.tsx app/recipe/create.tsx app/upgrade.tsx \
  app/editor/\[recipeId\].tsx \
  app/_layout.tsx app/\(tabs\)/_layout.tsx \
  FEATURES.md MANUAL_TESTS.md BACKEND.md \
  docs/edge-functions.md \
  tsconfig.json .gitignore package.json package-lock.json \
  .claude/plans/phase-7-ai-features.md \
  NEXT_STEPS.md

git commit -m "Phase 7: AI features — URL import + Make me Sketch

- Edge Functions scaffolding (cors/auth/ai/tier/errors shared helpers)
- extract-recipe function: SSRF-guarded scrape + Haiku + ai_jobs log
- auto-sticker function: Haiku picks 3-5 stickers, server rolls placement
- /recipe/import modal with 4 tabs (Paste Link / Type / Photo / File)
- Make-me-Sketch button in editor stickers mode, single-frame undo
- Free-tier caps: 20 url_extract/month, 5 auto_sticker/month
- /upgrade placeholder + paywall cards on both surfaces"
```

### Option B — split commits

Two commits with the same file set divided at the natural fault line (URL-import files vs. auto-sticker files). Slightly more churn, slightly better `git bisect` later. Pick whichever you prefer — the diff is the same either way.

(Do not commit until the manual tests pass and you've skimmed the diff.)

---

## 9. What's next after Phase 7

Phase 7 is code-complete. After device regression passes:
- Flip `PLAN.md` Phase 7 row to ✅ Done.
- Optional follow-ups deferred from 7.3: extracting the shared `AiPaywallSheet` component (currently inlined in PasteLinkTab + MakeMeSketchButton), and adding a `useTier()` hook — neither load-bearing today since the server 429 is the source of truth for caps.
- Phase 8 (Telegram bot) is the master tracker's next item; it reuses `extract-recipe` for screenshots.
- Shelves Phase 2 is still asset-gated (sprig PNGs + wood plank) if you want to unblock that first.

---

## Troubleshooting quick refs

- **`supabase functions deploy` fails with Docker error:** CLI needs Docker running for some ops. If Docker Desktop isn't installed, `brew install --cask docker` and start it once. For `deploy` specifically it's optional — try `supabase functions deploy extract-recipe --no-verify-jwt=false` first; if it still complains, install Docker.
- **Expo Go can't connect:** check `networksetup -getairportnetwork en0`. If you're on BELL807, use `--tunnel`. Otherwise `--lan` should work.
- **tsc error in `exportRecipePdf.ts`:** pre-existing, not related to Phase 7. Leave it alone for now.
- **Secrets didn't stick:** `supabase secrets list` to verify `ANTHROPIC_API_KEY` is present.
- **Fresh Expo install complained about native modules:** `npx expo install --check` to reconcile SDK-compatible versions.
