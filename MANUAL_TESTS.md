# Manual device test scenarios

Living document. One section per phase. Run these on a real iPhone via Expo Go + tunnel before marking a phase done on the north-star test.

## Getting on device

```bash
npx expo start --tunnel
```

Scan the QR with iPhone Camera → opens Expo Go. SDK 54 bundles Skia / Reanimated / Worklets so the app runs in Expo Go without a dev build.

---

## Phase 7.1 — AI recipe import from URL (landed pending)

Prereqs:
- `ANTHROPIC_API_KEY` set in Supabase secrets.
- `extract-recipe` Edge Function deployed (`supabase functions deploy extract-recipe`).
- Signed-in user on the Free tier.

### 1. Tab modal opens from the FAB
- Home → tap centre `+` FAB
- ✅ Expect: "Import a Recipe" modal slides up; 4 tabs visible; Paste Link tab active by default
- ✅ Expect: Photo + File tabs greyed out with "Soon" pill; tapping them does nothing

### 2. Happy path — recognised recipe site
- Paste Link tab → paste `https://www.bbcgoodfood.com/recipes/tomato-soup` → tap **Import Recipe**
- ✅ Expect: button shows spinner for ~2–5 seconds
- ✅ Expect: auto-switches to Type tab; Title filled ("Tomato soup" or similar); ≥ 3 ingredients; ≥ 2 instruction lines; sage-left-border banner reads "Imported from bbcgoodfood.com"
- Tap Save → ✅ modal dismisses, Recipe detail opens with the new recipe

### 3. Non-recipe URL — partial fallback
- Paste Link → paste a news article URL (e.g. any nytimes.com/world/... link you have handy)
- Tap Import Recipe
- ✅ Expect: auto-switches to Type with title filled (or "Untitled Recipe"), ingredients/steps empty, partial banner visible

### 4. Invalid URL — inline error
- Paste Link → type `localhost:8000` → tap Import Recipe
- ✅ Expect: no network call; inline red text "That doesn't look like a recipe URL."
- Same for `notaurl`, `ftp://foo`, `https://10.0.0.1/`

### 5. Rate limit — 10-second window
- Immediately after a successful Import, change the URL and tap Import again within 10 seconds
- ✅ Expect: inline "You're going a bit fast — try again in a moment."

### 6. Monthly cap — paywall replaces the Import button
- Seed 20 successful `url_extract` rows into `ai_jobs` for the test user for the current month (use Supabase Studio or `psql`)
- Paste Link → paste any URL → tap Import Recipe
- ✅ Expect: Import button is replaced by a card "You've used 20 / 20 imports this month" + "Upgrade to Premium" ClayButton
- Tap Upgrade → ✅ Upgrade modal opens (placeholder copy); tap "Got it, thanks" → returns to Import modal

### 7. Manual path still works (Type tab)
- Paste Link → switch to Type tab without importing
- Enter Title only → Save → ✅ recipe saves, modal dismisses, Recipe detail opens

### 8. Tab state preservation
- Paste Link → paste a URL but don't submit → switch to Type → type a title
- Switch back to Paste Link → ✅ URL still present
- Switch back to Type → ✅ title still present

### 9. Legacy route redirect
- In Safari, navigate to `spoonsketch://recipe/create` (if deep links are set up) or any in-app link to `/recipe/create`
- ✅ Expect: lands on Type tab of the Import modal

### 10. Close + reopen
- Open modal → × close → reopen from FAB
- ✅ Expect: fresh state (empty URL input, empty Type form, no banner)

### 11. Keyboard handling
- Paste Link → focus URL input on a short device → keyboard must not cover the Import button
- Type tab → focus Ingredients (at the bottom) → ✅ field scrolls above the keyboard

### 12. Offline behaviour
- Airplane mode on → Paste Link → paste URL → Import
- ✅ Expect: TanStack Query surfaces a network failure; inline error reads a friendly fallback (not a stack trace). Note: `networkMode: 'always'` is set app-wide so the mutation will actually attempt and fail rather than be pre-empted.

### 13. `ai_jobs` observability
- After each successful and failed import attempt, check `ai_jobs` in Supabase Studio:
- ✅ One row per attempt
- ✅ `job_type = 'url_extract'`, `status` done or failed, `tokens_used` > 0 on success, `model = 'claude-haiku-4-5-20251001'`

### If something fails
Add a BUG-NNN row to BUGS.md (see BUG-017 for a template), wire it to the specific scenario above, and fix before flipping Phase 7.1 to ✅ Done.

---

## Phase 7.2 — Make me Sketch (auto-sticker) (landed pending)

Prereqs:
- `ANTHROPIC_API_KEY` set in Supabase secrets.
- `auto-sticker` Edge Function deployed (`supabase functions deploy auto-sticker`).
- Signed-in user on the Free tier with at least one recipe that has a title + ingredients.

### 1. Button visible in Stickers mode
- Open any recipe with a title → tap **Decorate** → editor opens
- Tap **✱ Stickers** mode
- ✅ Expect: **Make me Sketch** terracotta button at the top of the sticker panel, with star icon + label
- ✅ Expect: horizontal sticker tray still visible below the button

### 2. Disabled when recipe has no title
- Create a new recipe via FAB → Type tab → save with title field *empty but it won't let you — so* create a recipe with a minimum title → open editor
- Open the editor and immediately clear the title via Arrange Blocks block edit (if feasible) OR use a recipe you deliberately seeded with empty title in the DB for this test
- ✅ Expect: Make me Sketch button appears disabled (greyed out, tap does nothing)

### 3. Happy path — ≥3 stickers appear
- Open a recipe with title "Tomato Basil Soup" (or similar — pick one with strong keyword overlap)
- Stickers mode → tap **Make me Sketch**
- ✅ Expect: spinner in the button for ~1–3 seconds
- ✅ Expect: 3–5 stickers appear along the edges of the canvas (top / bottom / left / right bands — not over the recipe text in the middle)
- ✅ Expect: stickers are semantically relevant — for a tomato/basil soup you should see at least one of `tomato`, `basil`, or `spoon`
- ✅ Expect: toast below the button reads "Sketched N stickers! Tap undo if you want to try again."
- ✅ Expect: toast auto-dismisses after ~3.5 seconds

### 4. Undo pops all stickers in one frame
- Immediately after a successful sketch → switch to Draw mode → tap the Undo ↩ button once
- ✅ Expect: all sketch-placed stickers disappear together (not one at a time)
- Tap Undo again → ✅ any pre-existing canvas state is restored

### 5. Variety over multiple calls
- On the same recipe, tap Make me Sketch three times in a row (wait 10 s between each to avoid rate limit, or use a different recipe each time)
- ✅ Expect: selections change between runs — Haiku doesn't return identical picks every time
- ✅ Expect: each run's stickers don't overlap each other within a single call (server enforces min separation)

### 6. Rate limit — 10-second window
- Tap Make me Sketch → wait for success → immediately tap again
- ✅ Expect: snackbar "A little fast — wait a moment and try again."

### 7. Monthly cap — paywall replaces the button
- Seed 5 successful `auto_sticker` rows into `ai_jobs` for the test user for the current month (Supabase Studio or `psql`)
- Stickers mode → ✅ button renders normally; tap Make me Sketch
- ✅ Expect: button replaced by a paywall card "5 / 5 sketches used this month" + **Upgrade to Premium** inner button
- Tap Upgrade → ✅ Upgrade modal opens

### 8. Manual sticker tap still works after sketch
- After a successful sketch, tap any single sticker in the tray
- ✅ Expect: that sticker drops in the centre of the canvas as usual (non-sketch path untouched)
- ✅ Expect: the manual add is one separate undo frame from the sketch batch — undo removes only the manual one first, then a second undo removes the sketch batch

### 9. Stickers stay on edges, not over text
- On 3 different recipes, tap Make me Sketch
- ✅ Expect: for all runs, no sticker's centre lands inside the middle band (roughly x ∈ [0.2, 0.8] AND y ∈ [0.2, 0.8] of the canvas)

### 10. Offline behaviour
- Airplane mode on → Make me Sketch
- ✅ Expect: snackbar with a friendly error; no stickers appear; no half-state

### 11. `ai_jobs` observability
- After each sketch attempt (success or failure), check `ai_jobs` in Supabase Studio:
- ✅ One row per attempt, `job_type = 'auto_sticker'`, `status` done or failed, `tokens_used > 0` on success, `output_data` contains the `elements` array, `input_data` contains the `recipe_id`

### 12. Recipe-empty guard (server-side)
- Seed a recipe with a title but strip the title via DB before the test (`update recipes set title='' where id=...`)
- Open the editor → Stickers → Make me Sketch
- ✅ Expect: button is disabled (client-side guard); if you bypass and hit the function directly, it returns 422 `recipe_empty`

### 13. Persistence across recipes
- Sketch on Recipe A → open Recipe B (no sketch there yet) → open Recipe A again
- ✅ Expect: Recipe A still has its sketch stickers (per-recipe canvas state, BUG-015 regression check)

### If something fails
Add a BUG-NNN row to BUGS.md, wire it to the specific scenario above, and fix before flipping Phase 7 to ✅ Done in PLAN.md.

---

## Phase C — Book-level template + font defaults (landed 2026-04-21)

### 1. Book default applies to recipes linked to that book
> **Linkage rule:** the book default only flows if the recipe is linked to the cookbook. A recipe gets linked when it's added as a page via Book Builder → Add page → Recipe. `addBookPage` backfills `recipes.cookbook_id` on first-add so the editor can resolve the book default.

- Shelves → create a new cookbook ("Test Book A")
- Open it → gear ⚙︎ → pick template **Journal**, font **Marck** → **Save**
- ✅ Expect: modal closes; reopening shows Journal + Marck pre-selected (persisted)
- Back to Home → create a recipe (any title, one ingredient, one step)
- Back to Shelves → open Test Book A → **Add page → Recipe → pick the new recipe**
- Tap the added page to open the editor → tap Layout
- ✅ Expect: Journal template + Marck font already selected (no prior per-recipe edit)

### 2. Per-recipe override wins over book default
- In that recipe → Layout mode → change template to **Photo Hero**, font to **Amatic** → confirm the reset alert
- Tap Done → exit editor
- Reopen the recipe
- ✅ Expect: still Photo Hero + Amatic (per-recipe override persisted server-side)

### 3. Changing book default does NOT mutate already-edited recipes
- Book Builder → gear ⚙︎ → switch default to **Classic** / **Caveat** → **Save**
- Reopen the recipe from test 2
- ✅ Expect: still Photo Hero + Amatic (per-recipe override protects it)
- Create a fresh recipe → add it as a new page in the book → open its editor
- ✅ Expect: Classic + Caveat

### 4. Survives app restart (server-authoritative hydration, not just Zustand)
- Force-kill Expo Go, relaunch, open the recipe
- ✅ Expect: same template + font as before restart

### 5. Double-submit guard (fix for the 3-cookbook bug)
- Shelves → New → type title, pick color → tap **Create** three times fast
- ✅ Expect: exactly one cookbook, spinner visible on button during save
- Swipe-delete on a cookbook → tap Delete quickly twice
- ✅ Expect: one delete, no double-error

### 6. Keyboard doesn't cover any input / list in modals or sheets
- Shelves → New → tap title field → ✅ input visible above keyboard
- Book Builder → **Add page → Recipe → Choose Recipe** → search input focuses → ✅ search field + recipe list visible above keyboard (the sheet rises with the keyboard on iOS)
- Login → tap email/password → ✅ fields visible
- Recipe create → tap any field → ✅ visible
- Editor → tap an ingredient/step to edit → ✅ the edit sheet sits above keyboard

> **Audit note:** all TextInput hosts (`login`, `recipe/create`, `CookbookFormModal`, `BlockItemEditor`, `PageTypePicker`) are now keyboard-safe. If a new screen/modal adds a TextInput, wrap it in `KeyboardAvoidingView` (behavior=`padding` on iOS), or if it's an absolute-positioned custom sheet, use the `Keyboard.addListener('keyboardWillShow/Hide')` + animated-offset pattern from `PageTypePicker.tsx`.

### 7. Editor save failure surfaces
- Turn on airplane mode → in editor, change template → confirm reset
- ✅ Expect: "Save failed" Alert appears
- Turn airplane mode off

### 8. Error boundaries don't break anything visible (passive check)
- Navigate through Home / Shelves / Elements / Profile / Book / Create Recipe
- ✅ Expect: all render normally (boundaries only fire on actual render crashes)

### If something fails
Grab the Expo terminal log for the failing step — the stack trace tells us exactly which precedence step broke.

---

## Phase D — Cookbook-level section titles (landed 2026-04-21)

### 1. Section titles flow to all six templates
- Shelves → open a cookbook → ⚙︎ → under **Section titles**, set
  - Ingredients → `Інгредієнти`
  - Method → `Спосіб приготування`
  - tap **Save**
- ✅ Expect: modal closes; reopening ⚙︎ shows the new strings pre-filled.
- Open a recipe page that's part of this book.
- In the editor, cycle through all six templates (Layout → template picker):
  - **Classic** → section heads read `Інгредієнти` / `Спосіб приготування`
  - **Photo Hero** → same
  - **Minimal** → same
  - **Two Column** → same (left col ingredients head, right col method head)
  - **Journal** → ingredients note reads `Інгредієнти:` (colon is Journal's decoration — kept intentionally)
  - **Recipe Card** → same

### 2. Clean view + share text use the cookbook labels
- Back to the recipe detail → **Clean** toggle
- ✅ Expect: `Інгредієнти` heading replaces "Ingredients"; `Спосіб приготування` heading replaces "Instructions".
- Tap **Share recipe** → preview the share sheet text.
- ✅ Expect: `Інгредієнти:` and `Спосіб приготування:` appear where "Ingredients:" / "Instructions:" used to.

### 3. Empty string falls back to default
- Book settings → clear both Ingredients + Method fields → **Save**
- ✅ Expect: modal closes; templates + Clean view render the default English `Ingredients` / `Method`.
- Reopen ⚙︎ → fields are empty (faithful to what's stored); placeholder shows the default.

### 4. Live update — no remount needed
- Open a recipe in its editor → note the current section titles.
- Without closing the editor: go back to the book (or another device/tab) → change titles → Save.
- Return to the editor page → ✅ next render picks up the new titles (TanStack invalidates `['cookbook', id]`).

### 5. Standalone recipe (no cookbook link) shows defaults
- Home → create a new recipe but **do not** add it as a page in any cookbook.
- Open the editor → ✅ section headings show the default `Ingredients` / `Method`.

### 6. Keyboard doesn't cover Ingredients/Method inputs
- Book ⚙︎ → tap Method input.
- ✅ Expect: the modal lifts ~40% of the keyboard height so the input + Save button stay visible above the keyboard.
- Dismiss the keyboard → modal settles back.

---

## Phase E — Paper type at cookbook level (landed 2026-04-22)

### 1. Picker renders and persists
- Shelves → open a cookbook → ⚙︎ → scroll to **Paper** row.
- ✅ Expect: four tiles — **Blank** (selected, no pattern), **Lined** (horizontal lines), **Dotted** (dot grid), **Grid** (crosshatch). Terracotta border marks the active one.
- Tap **Lined** → border jumps → tap **Save**.
- ✅ Expect: modal closes; reopening ⚙︎ shows Lined pre-selected.

### 2. Pattern visible in editor
- Open a recipe that belongs to this book → editor canvas.
- ✅ Expect: pale horizontal lines fill the page below the top title area.
- ⚙︎ → switch to **Dotted** → Save → reopen the recipe's editor.
- ✅ Expect: dot grid instead of lines.
- Repeat with **Grid** → crosshatch of fine ink lines.
- Repeat with **Blank** → no pattern.

### 3. Pattern visible in Scrapbook preview
- Recipe detail → **Scrapbook** toggle.
- ✅ Expect: same pattern renders on the A4 preview (washi + corner sticker still on top).
- **Clean** toggle → ✅ no pattern (Clean view is intentionally chrome-free).

### 4. Drawing strokes still land above the pattern
- Editor → Draw mode → scribble over a lined page.
- ✅ Expect: strokes render above the lines, not hidden underneath.

### 5. Recipe with no cookbook link falls back to blank
- Home → create a fresh recipe, don't add it to any book.
- Open its editor.
- ✅ Expect: no pattern visible, regardless of what any cookbook's paper type is set to.

### 6. Modal still keyboard-safe with the extra row
- Book ⚙︎ → tap Method field.
- ✅ Expect: modal lifts so the Method input + Save button stay visible above the keyboard. Paper picker may scroll out of view — that's fine, it's a tap-target above the inputs.

> **Print note (Phase F):** the paper pattern renders as SVG on the screen but does **not** appear in a `makeImageSnapshot` PNG export today. That parity is Phase F's job (shared JSON schema + HTML/CSS rendering in Puppeteer). Exporting a PDF during Phase E will produce a blank-paper PDF even if the user picked "lined" — log as a bug only if you expected otherwise.

---

## Editor stability (post-Phase E, landed 2026-04-22)

Covers BUG-011 (drawing), BUG-012 (block jump), BUG-013 (delete ×). Run after any reload of the app to confirm the regressions stay dead.

### 1. Drawing survives reload (BUG-011)
- Editor → Draw → scribble a line. ✅ Line renders and stays after releasing the finger.
- Kill app / Metro reload / pull-to-refresh on device → reopen the **same recipe**'s editor.
- Draw again. ✅ New stroke also stays committed (not just the live flash that vanishes on release).
- Open a **different** recipe's editor → Draw → scribble. ✅ Stroke commits.

### 2. Blocks don't jump after template change (BUG-012)
- Editor → Layout → switch template from **Classic** → **Journal** (accept the reset alert if it appears).
- ✅ Expect: blocks render in their final positions immediately. No visible downward shift ~200ms after the template swaps.
- Switch back to **Classic** → same expectation. Repeat for **Minimal**, **Two-Column**, **Photo Hero**, **Recipe Card**.

### 3. Delete × works on short blocks (BUG-013)
- Open any recipe with tags set (e.g. `["quick","veg"]`).
- Editor → Layout → **Arrange Blocks** → tap the tags block (usually renders as a 1-line compact row).
- Tap the red `×` at the top-right corner. ✅ Expect: block disappears (soft-hide; restored via **Reset**).
- Repeat on a compact title or 1-line description.
- Also try on a tall block (method / ingredients) — ✅ `×` still works there too, just to confirm no regression on the normal case.

---

## Phase A — Description normalization (landed 2026-04-22)

### 1. Description renders as a movable block in every template
Repeat in each of the 6 templates (Classic, Photo Hero, Minimal, Two Column, Journal, Recipe Card):
- Open a recipe that has a non-empty description.
- Layout mode → change to this template.
- ✅ Expect: a standalone description block appears between the title/hero/banner and the content rows.
- Arrange Blocks → tap the description block → drag it. ✅ Moves independently of title / pills / hero.
- Font-bump + / – buttons scale the description text, not the other blocks.
- Tap × → description hides; **Reset** restores it.

### 2. Photo Hero hero loses its description line
- Template: **Photo Hero**.
- ✅ Expect: the hero image overlay shows title + time pills only (no description text inside the dark overlay).
- ✅ Expect: a separate description block renders below the hero band.

### 3. Recipe Card banner loses its description line
- Template: **Recipe Card**.
- ✅ Expect: accent banner shows title only (no small description line).
- ✅ Expect: a separate description block between banner and the photo row.

### 4. Classic / Minimal split header into description + pills
- Template: **Classic** (or **Minimal**).
- ✅ Expect: description and time/servings pills are now two separate blocks.
- Arrange Blocks → drag pills block without moving description. ✅ Works independently.

### 5. Two Column gains a description block
- Template: **Two Column**.
- ✅ Expect: a full-width description block between the title and the left/right columns. Previously Two Column hid description entirely.

### 6. Recipes with empty description don't render the block
- Open a recipe where `description` is empty / null.
- Any template. ✅ Expect: no description block appears. Layout compresses to fill the space.

### 7. `schemaVersion: 2` migration clears stale overrides
- (Once only, on first reload after upgrade.) Any pre-existing `header` / `hero` / `banner` position overrides created before this change should be cleared. Opening any recipe → no crash, no misplaced blocks from old coordinates. ✅ Expect: everything renders at the new template defaults.

---

## PDF export (Phase F, landed 2026-04-22)

Classic template only in this commit. Other 5 templates fall back to Classic layout until their render functions land.

### 1. Export from Clean view
- Open any recipe with full content (title, description, ingredients, method, tags). Ensure it's on the **Classic** template (Layout → Classic).
- Recipe detail → **Clean** tab → tap **⤓ PDF** next to Share.
- ✅ Expect: "Preparing…" briefly, then the iOS print dialog appears with a preview of the page.
- Print dialog → pinch preview → tap share → **Save to Files**.
- ✅ Expect: a proper A4 PDF saved. Open it: title, description, pills, ingredients list, method list, tags all present; paper pattern renders if the book has one; palette colours match the app.

### 2. Export from Scrapbook view
- Same recipe → **Scrapbook** tab → tap **⤓ Export PDF** below the page preview.
- ✅ Same flow as test 1.

### 3. Export respects Arrange Blocks overrides
- Decorate → move the description block to an unusual position → Done.
- Back to recipe detail → Export PDF.
- ✅ Expect: the exported PDF shows description in the moved position, not the default.

### 4. Export respects fontScale + section titles
- Open cookbook → ⚙︎ → change Ingredients title to Ukrainian (e.g. "Що потрібно") → Save.
- Open a recipe in that book → Decorate → select ingredients-heading → A+ a couple of times → Done.
- Export PDF.
- ✅ Expect: heading shows the Ukrainian label at the bumped font size.

### 5. No editor session required
- Create a brand-new recipe, do NOT open the editor.
- Export PDF from the recipe detail screen.
- ✅ Expect: export succeeds with default Classic layout, default palette, no stickers, no drawings.

### 6. All 6 templates render (added 2026-04-22)
- Repeat test 1 (Clean → Export PDF) on a recipe set to each template in turn: Classic, Photo Hero, Minimal, Two Column, Journal, Recipe Card.
- ✅ Expect: each PDF shows the template's distinct style — Photo Hero with dark-overlay hero image; Minimal with the accent line under title; Two Column with side-by-side layout; Journal with rotated photo and dashed method lines; Recipe Card with accent-banner title.

### 7. Stickers in the exported PDF (added 2026-04-22)
- Open a recipe → Decorate → Stickers tab → drop several stickers (e.g. tomato, leaf, heart) on the page → drag to different spots → rotate one → Done.
- Back to recipe detail → Export PDF.
- ✅ Expect: every sticker appears in the PDF at the same position it had on the canvas, with the same rotation and (roughly) scale. Stacking order matches the canvas.

### 8. Drawing strokes in the exported PDF (added 2026-04-22)
- Same recipe → Decorate → Draw mode → scribble something on Layer 1 in terracotta. Switch to Layer 2 → scribble in a different colour. Change Layer 2 blend mode to Multiply → Done.
- Export PDF.
- ✅ Expect: both scribbles present; blend mode on Layer 2 visibly tints underlying strokes/text via Multiply. Eraser strokes, if any, don't render — that's the documented v1 limitation.

### Known scope of this commit
- Eraser strokes are skipped in the PDF output for now. Non-eraser layers render correctly. Proper eraser handling needs SVG masks (follow-up).
- Images use the recipe's `cover_image_url` directly — they print whatever the URL resolves to. For Supabase Storage URLs that requires the PDF renderer (expo-print's embedded WebView here) to be online.
- Stickers render as `<img>` tags pointing at local file URIs (via expo-asset). That works fine on device (iOS WebView loads file://) but a server-side Puppeteer renderer would need publicly-hosted URLs instead — a small patch when we get there.

---

## Font bump + persistence (post-Phase B, landed 2026-04-22)

Covers BUG-015 (canvas state per-recipe), BUG-016 (selected block z-order), BUG-017 (pills font scale).

### 1. Canvas customization survives recipe switch (BUG-015)
- Open recipe **A** → Layout → Arrange Blocks → drag title and ingredients-list to new positions. Place a sticker. Bump font on description. Done.
- Open recipe **B** → Arrange Blocks → drag different blocks. Place a different sticker. Done.
- Return to recipe **A**.
- ✅ Expect: A's block positions, sticker placements, font bumps are all intact. Not reset to defaults.
- Switch back to **B** — ✅ B's customization intact.
- Kill app → reopen → visit both recipes. ✅ Still intact.

### 2. Selected block shows above siblings when font is bumped (BUG-016)
- Arrange Blocks → select the **description** block.
- Tap A+ 3–4 times.
- ✅ Expect: text grows and remains visible. Previously the pills block rendered below would cover the bottom lines of description.
- Deselect → tap a different block.
- ✅ Expect: description is still visible; only the newly-selected block is elevated.
- Drag description down manually if it overlaps pills too aggressively.

### 3. Cooking time pills respond to font bump (BUG-017)
- Arrange Blocks → select the **pills** block (prep / cook / serves).
- Tap A+ 3–4 times. ✅ Expect: pill text visibly grows.
- Tap A− back to 100%. ✅ Expect: pill text shrinks back.
- Verify in every template that uses a pills block (Classic / Photo Hero / Minimal / Two Column / Journal). Recipe Card's pills live inside the image block and currently don't have their own font toolbar — that's a separate design question, not a regression.

---

## Drawing persistence (post-Phase B, landed 2026-04-22)

Covers BUG-014 — previously, opening a different recipe destroyed the previous one's drawings.

### 1. Drawings survive recipe switches
- Open recipe **A** → Draw mode → scribble a clear pattern (e.g. "A") → Done.
- Open recipe **B** → Draw mode → scribble a different pattern ("B") → Done.
- Return to recipe **A** → Draw mode.
- ✅ Expect: the "A" strokes are still there, not reset to empty layers.
- Go back to **B** — ✅ "B" strokes still there.

### 2. Drawings survive an app kill
- Draw something on a recipe → Done.
- Kill the app (swipe up from app switcher) → reopen → navigate back to that recipe.
- ✅ Expect: strokes restored.

### 3. Multiple recipes persist independently
- Draw different patterns on **3+ recipes**. Close the app between each.
- Reopen and visit each recipe's editor.
- ✅ Expect: each recipe keeps its own strokes. Switching between them does not mix or clear.

### 4. v2 migration (one-time, first reload after this commit)
- If you had drawn on any recipe before this fix, those strokes should still be present after reloading the app for the first time — migration seeds the new per-recipe map with the single v1 entry.
- ✅ Expect: no red-box on launch; the one pre-migration recipe's drawings are intact.

---

## Phase B — Full atomization (landed 2026-04-22)

### 1. Every field is its own block
Open the editor on a recipe with all fields populated. Layout mode → Arrange Blocks. In **each** of the 6 templates, confirm these atoms appear as independently selectable blocks:

- `title`
- `description`
- `pills` (time + servings)
- `image` / `photo`
- `ingredients-heading` (the text "Ingredients")
- `ingredients-list` (the bulleted rows)
- `method-heading` (the text "Method")
- `method-list` (the numbered steps)
- `tags` (Classic / Journal / Recipe Card only)

Tap the ingredients heading — ✅ block select ring shows around the label only, not the list. Same for method heading.

### 2. Heading + list drag independently
- Select `ingredients-heading` → drag it to a new position. ✅ Only the heading moves; the list stays.
- Same for `method-heading`.

### 3. Section titles from Book Settings flow into heading blocks
- Open Book Settings → change "Ingredients" to "Що потрібно" → Save.
- Reopen any recipe. ✅ Every template's ingredients-heading block shows the new text.

### 4. First-look preserved per template
Without any overrides:
- Classic: photo + ingredients side-by-side row, method below, tags sticker at bottom.
- Photo Hero: big image at top with dark overlay; title, description, pills stacked below; ingredients/method as two columns.
- Minimal: clean vertical stack, accent line under title.
- Two Column: title + description full-width; below, left = image + pills + ingredients; right = method.
- Journal: photo rotated; pills + ingredients to the right of photo; method below with ruled lines; tags sticker.
- Recipe Card: title in accent-banner background; photo + ingredients side-by-side; grid-style method below.

### 5. `schemaVersion: 3` migration
- (Once only, first reload after this commit.) Any pre-existing block override — whether from v1 (pre-A) or v2 (post-A) — gets cleared. Open any recipe. ✅ No crash; template renders at new defaults.

### 6. Empty fields render no block
- Recipe with no tags → no tags block.
- Recipe with no description → no description block.
- Steps list empty → no method-heading + method-list blocks.

### 7. Delete / Reset still work
- Arrange Blocks → delete each of the 9 atoms one at a time. ✅ Each disappears.
- Tap **Reset**. ✅ All 9 atoms reappear at defaults.

---

## Phase F — Print alignment contract (not yet implemented)

_To fill in once F lands. Placeholder scenarios:_

- Export test recipe to PDF → open in Preview.
- Text is selectable (vector, not raster).
- Paper lines crisp at any zoom.
- Text ↔ line alignment doesn't drift across pages.
- Run Lulu PDF validator (or at minimum: A4 size + embedded fonts + no RGB-only issues).
- Submit a test print order for one recipe.
