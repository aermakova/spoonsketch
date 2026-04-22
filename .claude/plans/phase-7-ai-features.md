# Plan — Phase 7: AI features (extract-recipe + Make-me-Sketch)

**Owner:** Angy
**Target phase (master tracker):** Phase 7 — "AI: auto-sticker + recipe import"
**Status:** 🧪 Code-complete, device-test pending (as of 2026-04-22)

### What landed so far (code only, not committed, not deployed)

- ✅ **7.0** — Edge Functions scaffolding + shared helpers in `supabase/functions/_shared/` (cors, errors, auth, ai, tier).
- ✅ **7.1** — `extract-recipe` Edge Function + `/recipe/import` modal (Paste Link / Type / Photo / File tabs). Photo + File tabs show "Soon" pill. Legacy `/recipe/create` → redirect. FAB now opens the modal.
- ✅ **7.2** — `auto-sticker` Edge Function + **Make me Sketch** button above the editor's sticker tray. Server picks 3–5 stickers via Haiku, rolls placement in safe zones, returns normalised coords. Client applies in a single undo frame via new `addStickersBatch` action.
- ✅ **7.3 (minimal)** — `/upgrade` placeholder modal live. Paywall cards inlined in both PasteLinkTab and MakeMeSketchButton (no shared `<AiPaywallSheet>` component). `useTier()` not added. Rationale: no current duplication pain, server 429 is the source of truth for caps — speculative abstractions violate "don't build beyond what the task requires".

### What's pending

1. Device walk-through of `MANUAL_TESTS.md § "Phase 7.1"` and `§ "Phase 7.2"`. Both sections have 13 scenarios each.
2. Supabase CLI install + `supabase link` + `ANTHROPIC_API_KEY` secret + `supabase functions deploy extract-recipe auto-sticker`. Checklist in `NEXT_STEPS.md`.
3. Commit when device-green. Single-commit template in `NEXT_STEPS.md § 8 Option A`.
4. Flip `PLAN.md` Phase 7 row to ✅ Done once tests pass.

---

## Goal

Deliver the two flagship AI features that anchor the freemium pitch:

1. **Recipe URL import** — paste any recipe link → Haiku extracts structured data → confirm → save. Unblocks Telegram bot (Phase 8) and is the primary path to "cookbook with 20 real recipes in 10 minutes".
2. **"Make me Sketch" auto-sticker** — in the editor, one tap fills the page with ≥3 relevant stickers chosen by Haiku based on recipe content. Flagship "wow" moment.

Both sit behind Supabase Edge Functions (Anthropic key never leaves the server), both log to `ai_jobs`, both are tier-gated server-side.

## North-star acceptance

From master tracker: *"Make me Sketch places ≥3 relevant stickers, link import extracts recipe."*

Plus:
- Free tier caps enforced server-side (client never trusted).
- Both surfaces have a working loading state, a recoverable error state, and a paywall state when capped.
- `ai_jobs` rows logged for every call (success and failure), with token counts for cost observability.
- All Edge Function code reviewable in a 15-minute sitting — no premature abstraction across the two functions.

## What's in / out of scope

| ✅ In this plan | ⏸ Deferred (explicit non-goals) |
|---|---|
| Edge Functions scaffolding (first `supabase/functions/` dir) | Image-based extraction wired end-to-end — lands with Phase 8 (Photo tab goes live then) |
| `extract-recipe` function: URL → recipe JSON | File-upload extraction (.pdf / .rtf / .txt) — File tab placeholder only |
| `auto-sticker` function: recipe → sticker placements | Ingredient/step editing *after* extraction (handled by the Type tab form) |
| New `/recipe/import` modal with 4 tabs | Sticker animation on placement (just appear) |
| Paste Link tab functional; Type tab functional (moved manual Create form) | Auto-detect clipboard URL on screen mount |
| Photo + File tabs visible but disabled ("Coming soon" badge) | Re-run / regenerate workflow ("try again, different stickers") |
| "Make me Sketch" button in editor Stickers tab | True paywall modal (just toast + upsell link for now) |
| Tier gating: 20 url-imports / 5 auto-stickers per month free | Admin dashboard for AI cost tracking |
| `ai_jobs` logging via shared helper | i18n of new strings (English only for now; uk pass in Phase 11) |
| Loading + error + paywall states on both features | JS-rendered SPA scraping (Puppeteer) — sites that need JS fall to "partial" response |
| Simple HTML→text scrape with heuristics | Streaming responses (both endpoints are one-shot) |
| Prompt caching on system prompts (ephemeral TTL) | |

## Current state (2026-04-22)

- Client: TanStack Query v5 + Zustand, `src/api/*.ts` pure async functions throwing `ApiError`.
- `src/api/client.ts` holds the Supabase client; anon key in `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `ai_jobs` table already exists with `job_type ∈ ('url_extract','image_extract','auto_sticker')`, `input_data`, `output_data`, `status`, `tokens_used`, `model`.
- `users.tier` column exists (`free` | `premium`), default `free`, RLS in place.
- `supabase/functions/` directory does **not** yet exist — Phase 7 creates it.
- Create screen (`app/recipe/create.tsx`) is a manual form. In Phase 7 it gets re-homed as the "Type" tab inside the new `/recipe/import` modal; the FAB routes to the modal instead.
- Tab FAB (`app/(tabs)/_layout.tsx`) currently navigates to `/recipe/create`. In Phase 7 it points to `/recipe/import` with the "Paste Link" tab default.
- Editor Stickers tab (`src/components/canvas/StickerTray.tsx`) lists the 16 built-in SVGs. Needs a "Make me Sketch" button at the top.
- 16 sticker keys match exactly what `BACKEND.md § STICKER_AI_KEYWORDS` defines.
- No `ANTHROPIC_API_KEY` secret set yet on the Supabase project.
- No i18n yet (new strings land English-only in `src/theme/strings.ts`-equivalent — inline is fine for now).

## Sub-phase breakdown

Five commits. Each is independently shippable to main (every commit leaves the app in a working state).

### 7.0 — Edge Functions scaffolding + shared helpers (infra, no user-visible change)

**Goal:** stand up the Edge Functions directory with the minimum shared plumbing so 7.1 and 7.2 are thin.

Files created:
- `supabase/functions/_shared/cors.ts` — standard CORS response helper (preflight + headers).
- `supabase/functions/_shared/auth.ts` — `requireUser(req)` returns `{ user, supabaseAdmin }` or throws a 401 response. Uses `SUPABASE_SERVICE_ROLE_KEY` for the admin client, validates the user's JWT from `Authorization: Bearer …`.
- `supabase/functions/_shared/ai.ts` — `anthropic` client instance + `logAiJob({ userId, jobType, input, output, tokensUsed, status, error })` writes to `ai_jobs`.
- `supabase/functions/_shared/tier.ts` — `getUserTier(userId)` reads `users.tier`, `getMonthlyUsage(userId, jobType)` counts `ai_jobs` rows in the current calendar month, `assertQuota({ tier, jobType, used })` throws a structured 429 `{ error: 'monthly_limit_reached', remaining: 0, reset_at }` when tripped.
- `supabase/functions/_shared/errors.ts` — thin `jsonError(status, code, message)` wrapper; all functions return the same shape: `{ error: string, message?: string }` with HTTP status.
- `supabase/config.toml` — minimal Supabase CLI config if missing (project id, function timeouts).
- `.gitignore` entry for `supabase/.temp/` (whatever the CLI drops).

Env secrets (set via `supabase secrets set`):
- `ANTHROPIC_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (should already be present in Supabase's function env)
- `SUPABASE_URL` (ditto)

Local dev notes baked into a single `docs/edge-functions.md` (or a short section in `BACKEND.md`):
- How to run `supabase functions serve` locally, how to pass a JWT, how to deploy, how to tail logs.
- Where the user lands when sharing a laptop: `supabase functions serve extract-recipe --no-verify-jwt` for quick local testing; real deploy re-enables JWT.

**Acceptance for 7.0:**
- `supabase functions list` shows nothing new yet (no function deployed until 7.1), but local harness can curl a placeholder function successfully.
- Shared helpers compile under Deno lint (`deno check`).
- No client-facing change. CI green.

Roughly: 1–2 hours of work, one commit.

---

### 7.1 — `extract-recipe` Edge Function + URL paste UI

**Goal:** paste a URL on the Create screen → loading spinner → structured recipe preview → edit or confirm → saved recipe.

#### Server

`supabase/functions/extract-recipe/index.ts`:
1. CORS preflight.
2. `requireUser(req)` → user + admin client.
3. Tier check: `assertQuota({ tier, jobType: 'url_extract', used: getMonthlyUsage(...) })`. Free cap **20/month**. Premium unlimited.
4. Parse body: `{ url: string }`. Validate it's a well-formed URL and not a private-range host (SSRF guard: reject `localhost`, `127.0.0.0/8`, `10.`, `192.168.`, `169.254.`, `file://`, `data:`). Return 400 on invalid.
5. `scrapeUrl(url)` — plain `fetch` with a 10-second timeout, a reasonable UA string, follow up to 3 redirects. Strip to text: prefer `<article>`, fall back to `<main>`, fall back to `<body>`, then strip script/style/nav/header/footer, collapse whitespace, cap at ~20k chars. No JS execution — JS-rendered SPAs return a near-empty string and fall through to Haiku which will return `partial: true`.
6. Haiku call with `EXTRACTION_SYSTEM_PROMPT` (cached, `cache_control: { type: 'ephemeral' }`) and a user turn containing locale + scraped text + source URL. Model: `claude-haiku-4-5-20251001`. `max_tokens: 1024`. Temperature 0 (extraction is deterministic).
7. Parse JSON out of Haiku's response. If parse fails → return 206 partial with `{ title: 'Untitled Recipe', partial: true, reason: 'extraction_failed' }`.
8. Log an `ai_jobs` row (done or failed) with tokens_used.
9. Return the extracted recipe. Response matches `BACKEND.md § extract-recipe` exactly (so the future Telegram bot can reuse the shape).

SSRF guard is load-bearing — an Edge Function that pulls arbitrary URLs is a perfect pivot point. Tests: localhost, 127.0.0.1, 192.168.x.x, a valid public URL, a redirect chain to a private IP (need to block after the redirect resolves, not just the initial URL).

Prompt (frozen, never edited per-call — cache stays warm):
> *You are a recipe extraction assistant. Given scraped text from a recipe webpage, extract exactly this JSON shape and nothing else: `{ title, description, ingredients: [{name, amount, unit, group}], instructions: [{step, text}], servings, prep_minutes, cook_minutes, tags, confidence }`. `tags` is ≤5 short lower-case tokens. `confidence` is 0–1. If you can't find a recipe, return `{ partial: true, reason: string }`. Respond with valid JSON only — no prose, no markdown fences. Respond in the same language the recipe content uses.*

#### Client

`src/api/ai.ts` (new):
- `extractRecipeFromUrl(url: string): Promise<ExtractedRecipe>` — invokes the Edge Function via `supabase.functions.invoke('extract-recipe', { body: { url } })`, throws `ApiError` with code `monthly_limit_reached` | `invalid_url` | `extraction_failed` | `network` as appropriate.

`src/types/ai.ts` (new):
- `ExtractedRecipe` type mirroring the Edge Function response (reuses `Ingredient`/`Instruction` types from `src/types/recipe.ts`).

`src/hooks/useExtractRecipe.ts` (new):
- TanStack Query `useMutation` wrapping the api call; on success, returns the parsed recipe for the screen to consume. No cache invalidation needed (no list is stale).

**New screen:** `app/recipe/import.tsx` — presented modally (`presentation: 'modal'` in the router), title "Import a Recipe" with an × close button.

**Tab bar** under the title, 4 tabs with Feather icons:

| Icon | Label | Status this phase |
|---|---|---|
| `paperclip` | Paste Link | ✅ Functional (7.1) |
| `edit-2` | Type | ✅ Functional — existing manual form moved here |
| `camera` | Photo | ⏸ Visible but disabled, "Coming soon" pill; wires up in Phase 8 |
| `file-text` | File | ⏸ Visible but disabled, "Coming soon" pill; deferred |

Route the FAB in `app/(tabs)/_layout.tsx` to `/recipe/import` (default tab: Paste Link). The old `app/recipe/create.tsx` becomes a `<Redirect href="/recipe/import?tab=type" />` stub for any lingering links.

**Paste Link tab UI** (mockup reference attached 2026-04-22):
- Heading (Fraunces, ink): "Paste the link to any recipe".
- Subcopy (Nunito, inkSoft): "We'll grab the ingredients, instructions, and photos for you."
- URL input: rounded paper-coloured field with 1px inkFaint border. Right-side × button clears the field. Placeholder: "Paste a recipe URL".
- Primary ClayButton: "Import Recipe" with small sparkle accents (can reuse Feather `star` or draw two 3-line sparkles in the corner — match mockup).
- Disabled state when input is empty.
- Divider: "Here are some we support:" (inkSoft, small caps).
- Supported sites row: 6 wordmarks as **styled text labels**, not copied logos (avoid trademark risk). Allrecipes, Food.com, Delish, Epicurious, NYT Cooking, Tasty — each rendered with an approximation of its look (colour + font weight) in a 3×2 grid. Flagged as a "might replace with real logos under fair-use later" decision.
- Tip card at bottom: paper-textured card with the built-in `whisk` sticker SVG (reuse, no new asset) and handwritten-font copy: *"Tip: You can always edit and make it your own."* with a small heart icon on the right.

**Flow on successful import:**
1. Button shows spinner + disabled for the duration.
2. On 200: switch active tab to **Type**, pre-populate all fields with the extracted data, scroll to top, show a small inkSoft "Imported from *domain.com*" banner above the title field.
3. User reviews/edits, taps existing "Save" CTA in the Type tab.
4. On Save success: dismiss modal, navigate to the new recipe's detail.

**Error + edge states:**
- `monthly_limit_reached` → replace the Import button with a paywall card: *"You've used 20 / 20 imports this month."* + "Upgrade to Premium" ClayButton. Paste field stays editable (user can still switch to Type and enter by hand).
- `invalid_url` → inline red text under the input: *"That doesn't look like a recipe URL."*
- `extraction_failed` (malformed AI response, timeout): inline amber text: *"Couldn't read that page. Try typing it in instead."* with a secondary "Switch to Type" button that toggles the tab.
- Partial (`{ partial: true }`): auto-switch to Type tab, pre-fill what we got, show amber banner: *"We only got the title — fill in the rest yourself."*
- Network-offline: inline: *"You're offline. Try again when you're back."*

#### Analytics

New events in `src/lib/analytics.ts`:
- `ai_extract_recipe_started` — `{ source: 'url' }`
- `ai_extract_recipe_succeeded` — `{ tokens_used, confidence }`
- `ai_extract_recipe_failed` — `{ reason }`
- `ai_extract_recipe_capped` — `{ used, limit }`

(Analytics module may not exist yet — if not, create a minimal `track(event, props)` stub that console.logs in dev and is wired to PostHog later. Per CLAUDE.md rule #6: type entry per event, no `any`.)

**Acceptance for 7.1:**
- FAB opens the **Import a Recipe** modal with 4 tabs visible; Paste Link + Type functional, Photo + File greyed out with "Coming soon" pill.
- Paste `https://www.bbcgoodfood.com/recipes/tomato-soup` on the Paste Link tab → auto-switch to Type → fields populated with title, ≥3 ingredients, ≥2 steps in ≤5 seconds. "Imported from bbcgoodfood.com" banner shows. Save works, recipe appears in the list.
- Paste a non-recipe URL (e.g. news article) → Type tab, partial banner, whatever title we could get.
- Paste `localhost:8000` → inline "That doesn't look like a recipe URL" under the input.
- Paste a valid URL on a "free" account that already has 20 imports this month → 429 → paywall card replaces the Import button.
- Tapping Photo or File tab does nothing (buttons disabled; pill is visible).
- Old path `app/recipe/create.tsx` → redirects into the Import modal Type tab.
- `ai_jobs` table has one row per attempt (success or failure).
- Token usage logged.
- New `BUGS.md` entries for anything found during device test.
- `FEATURES.md` has an "Import a Recipe" section (new top-level feature) with subsections for each of the 4 tabs; limits in Appendix A.
- `MANUAL_TESTS.md` has Phase 7.1 scenarios (happy, partial, invalid URL, capped, network-off, tab switching).

One commit once all device scenarios pass.

---

### 7.2 — `auto-sticker` Edge Function + "Make me Sketch" button

**Goal:** in the editor, tap "Make me Sketch" → ≥3 relevant stickers appear on the recipe page, placed by AI.

#### Server

`supabase/functions/auto-sticker/index.ts`:
1. CORS preflight + `requireUser`.
2. Tier check: `assertQuota({ jobType: 'auto_sticker' })`. Free cap **5/month** (call it out as a decision in `PLAN.md` § Open questions — we can change after device testing).
3. Body: `{ recipe_id: string, canvas_id: string }`.
4. Server fetches the recipe (title, ingredients, tags) via admin client — **don't trust the client to send recipe content** (avoids a free user crafting a fake "chocolate cake" payload to burn our key).
5. Build a compact prompt: recipe title, ingredients as a comma list, tags. Haiku turn: cached system prompt + user turn with recipe content + the full sticker key list + keyword map.
6. Haiku returns a JSON array `[{ sticker_key, reasoning }]` of exactly 3–5 stickers. **Server decides placement** — random `x`, `y` across safe zones (avoid the middle 60% where text lives), random small rotation (±15°), small scale jitter (0.9–1.2), incrementing `z_index` starting from the current max. This keeps the AI focused on the one thing it's good at (semantic matching) and avoids paying Haiku tokens to roll dice for coordinates.
7. Return: `{ elements: CanvasElementInsert[] }`. No DB write server-side — the client applies them via the existing Zustand canvas store + existing `canvasElements` insert path, so the existing undo stack Just Works.
8. Log `ai_jobs` row.

Prompt:
> *You are a scrapbook sticker picker. Given a recipe's title, ingredients, and tags, pick 3 to 5 stickers from this exact list that best decorate the page: `[tomato, lemon, garlic, basil, whisk, spoon, pan, wheat, strawberry, flower, leaf, heart, star, mushroom, bread, cherry]`. Prefer variety (don't pick 3 produce stickers for a produce dish — mix in a tool or mood sticker). Return JSON only, shape: `[{"sticker_key": "...", "reasoning": "short phrase"}]`. No prose, no markdown fences.*

Keyword map is *guidance for the model* baked into the prompt — don't pre-filter server-side. Haiku with keywords-as-context does better than our regex would.

#### Client

`src/api/ai.ts` (extended):
- `autoSticker({ recipeId, canvasId }): Promise<CanvasElementInsert[]>` — calls the function, returns element inserts. Throws `ApiError` on `monthly_limit_reached` | `ai_failed`.

`src/hooks/useAutoSticker.ts`:
- `useMutation`. On success, dispatches a single `addElements` Zustand action that pushes all returned elements in one undo frame (so `Cmd-Z` removes all five at once, not one at a time — this matches the "I didn't like it, give me a different set" mental model).

Editor Stickers tab (`src/components/canvas/StickerTray.tsx`):
- "Make me Sketch" ClayButton pinned at the top of the tray. Terracotta, sparkle icon (Feather `star`, tint white).
- Tap → haptic (`Haptics.impactAsync`) + spinner overlay on the whole canvas (not just the button — the user's eye is on the canvas, they want to see stickers appear there).
- Success: stickers fade in (existing CanvasElement enter animation if any; otherwise just mount them). Small toast below: "Sketched! Tap ↩ to undo."
- Error: inline snackbar at the top of the sheet. Capped → "Out of sketches this month. [Upgrade]".
- Button disabled state: greyed out when the recipe has no title/ingredients/tags (nothing to match on).

#### Analytics

- `ai_auto_sticker_started`
- `ai_auto_sticker_succeeded` — `{ sticker_count, tokens_used, sticker_keys: string[] }`
- `ai_auto_sticker_failed` — `{ reason }`
- `ai_auto_sticker_capped`
- `ai_auto_sticker_undone` — fire from the undo handler when the just-inserted batch is rolled back within 30s (signal for "stickers were bad")

**Acceptance for 7.2:**
- Open a recipe with title "Tomato Basil Soup" → Make me Sketch → at least one of `[tomato, basil, spoon]` lands. ≥3 stickers total. Placement is not inside the text block area (i.e. coordinates fall in safe zones).
- Undo pops all stickers in one step.
- Free user at 5/5 → paywall toast.
- `BUGS.md` + `MANUAL_TESTS.md` updated.
- `FEATURES.md` has "Make me Sketch" subsection under Editor.

One commit once all device scenarios pass.

---

### 7.3 — Tier gating polish + paywall surface (only if 7.1 + 7.2 didn't already cover it)

**Goal:** consistent user experience when a free user hits a cap, and groundwork for real RevenueCat integration later.

- Extract the "you're capped" toast into a reusable `<AiPaywallSheet>` component in `src/components/ui/`.
- "Upgrade" CTA in the sheet currently links to a placeholder `/upgrade` route (a one-line screen that says "Premium coming soon — thanks for your patience.").
- Add a `useTier()` hook that reads `users.tier` via TanStack Query (short staleTime, invalidated on auth events).
- Premium gating in the UI is **display only** — never gate the action client-side, always let the server 429 be the source of truth. The client-side tier read is only to show the right copy ("You've used 20/20" vs "unlimited").
- `FEATURES.md` Appendix A (Limits) gets the two new rows.
- `BACKEND.md § 7 Subscription logic` gets a cross-reference to the two new functions.

Defer to a separate follow-up plan:
- Actual RevenueCat integration (App Store IAP / Stripe web / webhook).
- The `/upgrade` screen's real design.

**Acceptance for 7.3:**
- The exact same `<AiPaywallSheet>` appears for both features.
- Tapping "Upgrade" lands somewhere coherent (even if the destination is a placeholder).

One tiny commit, or folded into 7.1/7.2 if it's trivial.

## Data model — no schema changes needed

`ai_jobs` already exists with the right shape. No migration this phase.

- `job_type = 'url_extract'` — 7.1.
- `job_type = 'auto_sticker'` — 7.2.
- `job_type = 'image_extract'` — reserved for Phase 8 (Telegram screenshots).

## Costs + rate limits

Rough back-of-envelope on Haiku pricing (cache-hit assumptions, Jan 2026 pricing):

| Feature | Tokens in | Tokens out | Cost per call | Monthly cost per free user at cap |
|---|---|---|---|---|
| `extract-recipe` | ~4–20k (scraped page) | ~400 | $0.003–$0.015 | ~$0.10 at 20 imports |
| `auto-sticker` | ~300 (recipe summary + keyword list) | ~150 | <$0.001 | <$0.01 at 5 calls |

Free tier caps (20 + 5) keep worst-case free-user cost at ~$0.10/mo. Premium uncapped but ceiling'd by reasonable human use (~200 imports/mo = $1–3/mo, well under premium ARPU).

Rate limit in addition to monthly cap: **1 call per 10 seconds per user per function**, enforced via `ai_jobs` (look at last row's `created_at`). Avoids runaway loops if the client has a bug.

## Files touched (summary)

New:
- `supabase/functions/_shared/{cors,auth,ai,tier,errors}.ts`
- `supabase/functions/extract-recipe/index.ts`
- `supabase/functions/auto-sticker/index.ts`
- `supabase/config.toml` (if missing)
- `src/api/ai.ts`
- `src/hooks/useExtractRecipe.ts`, `src/hooks/useAutoSticker.ts`, `src/hooks/useTier.ts`
- `src/types/ai.ts`
- `src/lib/analytics.ts` (if missing — otherwise extend)
- `src/components/ui/AiPaywallSheet.tsx`
- `src/components/import/ImportTabs.tsx` — 4-tab header (Paste Link / Type / Photo / File) with Feather icons + active underline.
- `src/components/import/PasteLinkTab.tsx` — URL input, Import button, supported-sites grid, tip card.
- `src/components/import/SupportedSitesRow.tsx` — 6 styled wordmarks in a 3×2 grid (no copied logos).
- `src/components/import/ImportTipCard.tsx` — whisk sticker + handwritten copy.
- `app/recipe/import.tsx` — the modal screen that hosts the tabs; `?tab=paste|type|photo|file` URL param preserves state on deep-link.
- `app/upgrade.tsx` (placeholder)
- `docs/edge-functions.md` (short dev guide)

Edited:
- `app/recipe/create.tsx` — becomes a `<Redirect>` stub to `/recipe/import?tab=type`; its form body moves verbatim into `src/components/import/TypeTab.tsx`.
- `app/(tabs)/_layout.tsx` — FAB target changes from `/recipe/create` to `/recipe/import`.
- `src/components/canvas/StickerTray.tsx` — Make-me-Sketch button.
- `src/lib/store.ts` — batched `addElements` action (for single-frame undo).
- `FEATURES.md` — new "Import a Recipe" section with subsections for each tab; Editor > Make me Sketch; Appendix A limits.
- `BACKEND.md` — cross-ref to two new functions, note secret names.
- `BUGS.md` — new rows as device testing finds issues.
- `MANUAL_TESTS.md` — Phase 7 scenarios.
- `PLAN.md` — Phase tracker row flips to ✅ Done once 7.1 + 7.2 + 7.3 ship.

## Open questions (flag before coding 7.2)

1. **Auto-sticker free cap.** Proposing 5/month. Could also be 3/month (stingier; nudges upgrade harder) or 10/month (looser; more dogfood data). Decision doesn't block 7.0/7.1.
2. **URL extraction model fallback.** If Haiku returns malformed JSON twice in a row on the same URL, do we retry once with a "reformat as JSON only" nudge, or just return partial? Proposing partial (simpler; rare in practice with temperature 0 + explicit JSON-only instruction).
3. **Sticker placement strategy.** Server-rolled random placement vs. letting Haiku pick coordinates. Proposing server-random — cheaper and gives more consistent visual results. Revisit in Phase 10 polish if users complain.
4. ~~Where does the paste-URL field live long-term?~~ **Resolved 2026-04-22 via mockup:** dedicated `/recipe/import` modal with 4 tabs (Paste Link / Type / Photo / File). Paste Link + Type functional in Phase 7; Photo lights up in Phase 8; File TBD.
5. **Supported-sites row: styled text vs. real logos?** Plan uses styled text to avoid trademark risk. If we want real logos, they go under fair-use attribution claims and need individual review. Decision deferrable — styled text is fine for now and can be swapped in place.

## Risks / gotchas

- **Expo Go and Edge Functions:** `supabase.functions.invoke` works fine from Expo Go. Test on tunnel-mode dev to make sure the network path is clean. No native module dependency.
- **Supabase JS SDK version:** confirm `@supabase/supabase-js` in `package.json` is ≥ 2.39 — older versions have flaky `functions.invoke` error handling.
- **SSRF + scrape timeout:** paranoid defaults. Reject private-range hosts pre- and post-redirect. 10s hard timeout.
- **Cache busting on system prompts:** if we edit the prompt, the first call after deploy pays the full cache-miss cost once. Acceptable; infrequent.
- **Undo stack breakage:** the batched `addElements` path must be one undo frame. Landmine: existing per-element undo works because each drag/drop is one frame, but a naive loop of single-insert actions would produce 5 frames. Add a specific test scenario for this.
- **Free-tier month rollover:** count via `created_at >= date_trunc('month', now())` in UTC. Users near midnight UTC might see a reset they didn't expect — acceptable for v1, note it in `FEATURES.md`.

## Order of operations

1. 7.0 (infra) — 1–2 hours.
2. 7.1 (URL import) — half a day with device testing.
3. Decide on open question #1 (auto-sticker cap).
4. 7.2 (Make me Sketch) — half a day.
5. 7.3 (paywall polish) — 30 minutes, or folded in.
6. Device regression pass against `MANUAL_TESTS.md` Phase 7 scenarios.
7. Flip master `PLAN.md` Phase 7 row to ✅ Done.

## Not in this plan (explicit)

- **Telegram bot** — Phase 8. Reuses `extract-recipe` (specifically the image_extract variant).
- **PDF export cost tracking** — Phase 9 has its own cost story.
- **Real RevenueCat integration** — separate plan after Phase 7 lands; we want to see real usage data before tuning tier limits.
- **Re-run / regenerate** — "make me a different sketch" is a Phase 10 polish item.
- **Sticker animation on placement** — Phase 10 polish.
- **Onboarding flow that shows Make-me-Sketch** — Phase 11 pre-launch.
