# Bug log

Canonical record of bugs found during development, fixes, and the test scenarios that should cover them going forward. Every new bug gets an ID `BUG-NNN`, a short repro, the root cause, the commit that fixed it, and a line to the test scenario in `MANUAL_TESTS.md`.

When automated tests land (Jest / Detox / Playwright), each row here should map to one or more regression tests.

| ID | Severity | Status | Area | Title |
|---|---|---|---|---|
| BUG-001 | Medium | ✅ Fixed | Shelves / mutations | Double-submit created duplicate cookbooks |
| BUG-002 | Medium | ✅ Fixed | Shelves / modals | Keyboard covered CookbookFormModal inputs |
| BUG-003 | Low | ✅ Fixed | Editor / mutations | Editor save failures silent |
| BUG-004 | Low | ✅ Fixed | TanStack / cache | Cookbook rename/delete didn't invalidate detail/book-pages queries |
| BUG-005 | Medium | ✅ Fixed | App shell | Only editor had an error boundary (per CLAUDE.md rule) |
| BUG-006 | Medium | ✅ Fixed | Book Builder / modals | iOS keyboard covered recipe list in PageTypePicker |
| BUG-007 | Medium | ✅ Fixed | Book Settings | No Save button; per-tap auto-save confused users |
| BUG-008 | **High** | ✅ Fixed | Book defaults | Book template/font never flowed to recipes (missing `recipes.cookbook_id` link) |
| BUG-009 | **High** | ✅ Fixed | Auth / iOS | SecureStore crash when iOS lock screen / app backgrounded |
| BUG-010 | **High** | 🟡 Deferred (Phase F) | Export / PDF | Paper pattern (lined / dotted / grid) missing from exported PDF |
| BUG-011 | **High** | ✅ Fixed | Drawing / store | Strokes silently discarded after reload (activeLayerId not persisted) |
| BUG-012 | Medium | ✅ Fixed | Editor / blocks | Text-heavy blocks jumped 40–80px down after template change |
| BUG-013 | Medium | ✅ Fixed | Editor / Arrange | Delete × on short blocks covered by right side handle |
| BUG-014 | **High** | ✅ Fixed | Drawing / persistence | Opening a different recipe destroyed the previous recipe's drawings |
| BUG-015 | **High** | ✅ Fixed | Canvas / persistence | Opening a different recipe destroyed the previous recipe's blocks, stickers, text edits, template, and font |
| BUG-016 | Medium | ✅ Fixed | Editor / Arrange | Selected block's text visually covered by next sibling block when font bumped |
| BUG-017 | Medium | ✅ Fixed | Editor / Arrange | Cooking time pills font size didn't respond to A+ / A− |
| BUG-018 | Low | ✅ Fixed | Editor / Stickers | Stickers-mode bottom panel cut off after Phase 7.2 added Make-me-Sketch button above the tray |
| BUG-019 | **High** | ✅ Fixed | Export / PDF | PDF used wrong fonts, broken sticker images, missing pill backgrounds, missing step badges, white page bg — preview vs PDF looked like different documents |

---

## BUG-019 — PDF export visually diverged from Scrapbook preview
- **Found:** 2026-04-22, narrowed to specific symptoms 2026-04-23 with side-by-side screenshots from the user.
- **Severity:** **High** — PDF was unrecognisable vs. the in-app preview (different fonts, broken sticker images, missing pill backgrounds, missing step-badge circles, white page where preview was cream, no decorative corner sticker). User can't trust what they'll print.
- **Repro:** Recipe with at least one user-placed sticker. Decorate → place stickers → Done → Recipe Detail → Scrapbook tab → Export PDF → Save to Files. Open the PDF: title in Times serif (not Fraunces), stickers as broken WebKit `?` placeholders, pills as plain text, step rows as plain numbers without circular badges, page background pure white.
- **Root cause:** five independent regressions in the print path. expo-print on iOS opens a sandboxed WKWebView with the following constraints we hadn't accounted for:
  1. **`file://` URIs blocked.** `<img src="file:///.../leaf.png">` from `Asset.localUri` won't load — WebView renders the broken-image placeholder. Stickers all gone.
  2. **External CSS fetches racy.** The `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` doesn't reliably finish before the page renders to PDF. Caveat happened to be cached and rendered correctly; Fraunces fell back to system serif. Non-deterministic.
  3. **`display: inline-flex` on `<span>` in print mode.** Pills, step badges, ingredient dots all used `display: flex/inline-flex` on span elements. In expo-print's render pass, span+flex degrades — width/height/background are dropped. Step badges showed as plain numbers, dots vanished.
  4. **Pill alpha colour faint.** `background: ${paletteAccent}22` is ~13% terracotta on cream. Visually almost invisible and JPEG compression hides what's left. Combined with #3, pills looked like plain text.
  5. **No `palettePaper` fallback.** If serialization is missing the value, body's `background: #fff` wins → pure white page instead of cream paper.
- **Fix:**
  - **Stickers**: `resolveStickerUris` in `src/lib/exportRecipePdf.ts` now reads each PNG via `expo-file-system/legacy` and emits a `data:image/png;base64,...` URI. Inline payload, no sandbox dependency.
  - **Fonts**: new `src/lib/pdfFontEmbed.ts` reads bundled `@expo-google-fonts/*` TTFs as base64 and emits an `@font-face` block inlined into the print HTML's `<style>`. 11 fonts (Fraunces 400/700, Nunito 400/600/700, Caveat 400/700, Marck Script, Bad Script, Amatic SC 400/700) — total ~1–2 MB HTML, expo-print handles fine. `<link>` to Google Fonts only fires now if no embedded set is supplied (preview path).
  - **CSS layout**: every template's `.pill / .step-badge / .dot` rule changed from `display: (inline-)flex` on `<span>` to `display: inline-block` with `line-height` / `text-align: center` / `vertical-align`. Print-portable across all WebKit versions.
  - **Pill background**: changed from `${paletteAccent}22` (alpha) to `${paletteBg2}` (solid cream tone). Mirrors what RN's TimePills uses in the editor.
  - **Page bg fallback**: `.page { background: ${palettePaper} || '#faf4e6'; }` plus `@media print { .page { background: ... !important; } }`.
  - **Corner sticker**: new `renderCornerDecoration` always emits a positioned `<img class="corner-leaf">` with the leaf sticker — matches the Scrapbook hardcoded `<Sticker kind="leaf">` at `app/recipe/[id].tsx:84`. `exportRecipePdf` always pre-resolves `'leaf'` even when the recipe has no user-placed stickers.
  - **Schema**: `RecipePageStyle.paletteBg2` field added; serializer populates from `palette.bg2`.
- **Commit:** _(this commit)_
- **Test:** new scenario in `MANUAL_TESTS.md § PDF export — preview parity` (next commit). Smoke test: same recipe, Scrapbook view → Export PDF → open in Files. Verify Fraunces title, cream page, watercolor stickers, terracotta circular step badges, dotted ingredient bullets, leaf in bottom-right.

---

## BUG-018 — Stickers tab panel cut off
- **Found:** 2026-04-22 (phone test, reported after Phase 7.2 landed)
- **Severity:** Low — visual; sticker tray partially clipped at the bottom, still usable.
- **Repro:** Editor → Stickers mode. The bottom panel is 148pt + safe-area, but Phase 7.2 added a Make-me-Sketch button above the horizontal sticker tray, pushing the tray into the clipped area.
- **Root cause:** `panelHeight` in `app/editor/[recipeId].tsx` was sized for the old content (tray only). Phase 7.2 added the Make-me-Sketch button + success/error toasts without updating the height.
- **Fix:** bump stickers-mode height from 148 to 210 (matching Draw mode). Commit: (this commit).
- **Test scenario:** `MANUAL_TESTS.md § Phase 7.2 #1` already asserts the button is visible with the tray below — will catch regressions here.

---

## BUG-001 — Double-submit creates duplicate cookbooks
- **Found:** 2026-04-21
- **Severity:** Medium (data integrity)
- **Repro:** Shelves → New → type title, pick color → tap **Create** 3× quickly → 3 cookbooks created with the same name.
- **Root cause:** `useMutation` fires once per `mutate()` call. No guard between tap and modal-close (which happens in `onSuccess`).
- **Fix:** Added `loading` prop to `ClayButton` (spinner + disable), `submitting` prop to form modals, `useSubmitGuard` hook for raw async handlers. Applied app-wide: cookbook create/edit, swipe-delete, sign-out, login, recipe create.
- **Commit:** `2922726` (Phase C + submit guard)
- **Test:** `MANUAL_TESTS.md` § Phase C test 5.

## BUG-002 — Keyboard covers CookbookFormModal inputs
- **Found:** 2026-04-21
- **Severity:** Medium (UX blocker)
- **Repro:** Shelves → New → tap title field → keyboard rises over the input and color swatches.
- **Root cause:** Modal had no `KeyboardAvoidingView`.
- **Fix:** Wrapped in `KeyboardAvoidingView` with iOS `behavior="padding"`.
- **Commit:** `2922726`.
- **Test:** `MANUAL_TESTS.md` § Phase C test 6.

## BUG-003 — Editor save failures silent
- **Found:** 2026-04-21
- **Severity:** Low (reveals itself as "lost changes" later)
- **Repro:** Airplane mode + change template in editor → no feedback, changes appear saved but weren't.
- **Root cause:** `upsertCanvasMutation` had no `onError`. TanStack keeps mutations alive across unmount so failures would never surface.
- **Fix:** Added `onError: (e) => Alert.alert('Save failed', e?.message)` + spinner on Done button + disabled close/Done while in-flight.
- **Commit:** `37e3618`.
- **Test:** `MANUAL_TESTS.md` § Phase C test 7.

## BUG-004 — Cookbook mutations leave stale caches
- **Found:** 2026-04-21 (audit, not field report)
- **Severity:** Low (stale UI until next refetch)
- **Repro:** Edit cookbook title on Shelves → open Book Builder → old title still shown briefly. Or: delete cookbook from Shelves → `['cookbook', id]` + `['book-pages', id]` stay in cache.
- **Root cause:** Mutations invalidated `['cookbooks']` but not related keys.
- **Fix:**
  - `shelves.updateMutation` now also invalidates `['cookbook', vars.id]`.
  - `shelves.deleteMutation` now also removes `['cookbook', id]` + `['book-pages', id]`.
  - `book.renameMutation` + `book.settingsMutation` now also invalidate `['cookbooks']`.
- **Commit:** `37e3618`.
- **Test:** needs a dedicated scenario — **TODO: add "rename cookbook in Shelves → open book builder → new title visible immediately"**.

## BUG-005 — Missing error boundaries (CLAUDE.md rule)
- **Found:** 2026-04-21 (audit)
- **Severity:** Medium (one render-time crash would white-screen the app)
- **Repro:** Throwing a render-time error in any tab screen crashes the whole app.
- **Root cause:** CLAUDE.md says "Error boundaries on every tab root and the editor." Only the editor had one.
- **Fix:** New `withErrorBoundary` HOC. Wrapped `(tabs)/index`, `shelves`, `elements`, `me`, `book/[cookbookId]`, `recipe/create`. Recipe detail + editor already had boundaries. `add.tsx` is a `<Redirect>` stub so skipped.
- **Commit:** `37e3618`.
- **Test:** `MANUAL_TESTS.md` § Phase C test 8 (passive — navigate all tabs, none crash). **TODO: add a dev-only "force crash" toggle in Me screen to assert the fallback UI renders.**

## BUG-006 — Keyboard covers recipe list in PageTypePicker
- **Found:** 2026-04-21 (phone test)
- **Severity:** Medium (UX blocker, identical pattern to BUG-002)
- **Repro:** Book Builder → **Add page → Recipe → Choose Recipe** → search input autofocuses, keyboard covers the entire recipe list.
- **Root cause:** `PageTypePicker` is a custom `Animated.View` bottom sheet at `position: absolute; bottom: 0`. `KeyboardAvoidingView` doesn't compose cleanly with absolute positioning, so we couldn't reuse BUG-002's fix.
- **Fix:** Added a second `Animated.Value` (`kbY`) driven by `Keyboard.addListener('keyboardWillShow'/'keyboardWillHide')`, combined with the entry/exit value via `Animated.add`. The sheet now slides up by keyboard height when the input focuses.
- **Commit:** `08ac9f5`
- **Test:** `MANUAL_TESTS.md` § Phase C test 6 (expanded to all TextInput hosts).

## BUG-007 — Book Settings modal had no Save button
- **Found:** 2026-04-21 (phone test)
- **Severity:** Medium (UX confusion; user tapped template but couldn't tell if it saved)
- **Repro:** Book Builder → ⚙︎ → change template → no "Save" button visible; user doesn't know if change persisted.
- **Root cause:** Modal called `settingsMutation.mutate()` on every picker tap (optimistic update), but had no explicit Save action — only a backdrop-tap / ✕ close. The "coming soon" info box looked like a disabled button, compounding confusion.
- **Fix:** Reworked to draft state in the modal (`template`, `font` useState initialized from cookbook). Added explicit **Cancel** + **Save** buttons. Save fires `settingsMutation.mutate(patch)` with `onSuccess: closeModal`. Spinner on Save button while in-flight; disabled when no changes. "Coming soon" box restyled as a small footer hint.
- **Commit:** `08ac9f5`
- **Test:** `MANUAL_TESTS.md` § Phase C test 1 + 3 (covers Save interaction; **TODO: add "open settings, change then Cancel → original values restored"**).

## BUG-008 — Book default never applied to recipes (missing FK link)
- **Found:** 2026-04-21 (phone test)
- **Severity:** **High** — core Phase C feature didn't work end-to-end
- **Repro:** Create cookbook with Journal default → Home → create recipe → open editor → still Classic (default fallback), not Journal.
- **Root cause:** Two independent paths linked recipes to cookbooks (`recipes.cookbook_id` FK + `book_pages` join table). `addBookPage` wrote only to `book_pages`, never backfilled `recipes.cookbook_id`. Editor hydration keyed off `recipe.cookbook_id` → null → cookbook query disabled → fell back to `'classic'`/`'caveat'`.
- **Fix:** `addBookPage` now backfills `recipes.cookbook_id` on first-add (only when currently null, so being added to a second book doesn't overwrite). Book builder's `addMutation` invalidates `['recipe', vars.recipe_id]` + `['recipes']` so the editor immediately sees the link.
- **Commit:** `08ac9f5`
- **Test:** `MANUAL_TESTS.md` § Phase C test 1 (rewritten to include the "add as book page" step — which is the trigger for linkage).
- **Related risk:** if we ever want "recipe can belong to multiple books," this FK approach breaks. For v1 the home-book-wins model is correct. Revisit during Phase B if we generalize page types.

## BUG-017 — Cooking time pills font size didn't respond to font bump
- **Found:** 2026-04-22 (device report, Bug 3 of 3)
- **Severity:** Medium (font-bump feature silently broken for the pills block)
- **Repro:** Editor → Layout → Arrange Blocks → select the **pills** block (prep / cook / serves). Tap A+ or A− in the font toolbar. ✅ Expected: text size changes. Actual: text size unchanged.
- **Root cause:** `TimePills` component hardcoded its own text styles (`t.pillLabel`, `t.pillVal`) without receiving or applying the parent block's fontScale. `bumpBlockFontScale` updated `blockOverrides['pills'].fontScale` correctly but the rendered text ignored it.
- **Fix:** Added an optional `fontScale` prop (defaulting to 1) to `TimePills` and wrapped every text style with `scaleText(style, fontScale)`. Updated all 5 callers where pills is its own block (Classic, Photo Hero, Minimal, Two Column, Journal) to pass `fontScale={pills.fontScale}`. Recipe Card keeps its TimePills inside the image block — image isn't text-heavy and has no font toolbar, so `fontScale` defaults to 1 there.
- **Commit:** `a9c4fdb`
- **Test:** `MANUAL_TESTS.md` § Font bump + persistence (post-Phase B) test 3.

## BUG-016 — Selected block's text visually covered when font bumped
- **Found:** 2026-04-22 (device report, Bug 2 of 3)
- **Severity:** Medium (looks like text clipping)
- **Repro:** Editor → Layout → Arrange Blocks → select a text-heavy block with a sibling below (e.g. description; pills renders below it). Tap A+ a few times. ✅ Expected: block visibly grows. Actual: block content extends downward but the sibling block below is rendered on top of the overflowed text, making the bottom lines look cut.
- **Root cause:** All atomized blocks are absolutely positioned. Blocks later in the JSX tree render on top of earlier siblings by default in React Native. When a text-heavy block grows (via fontScale bump), its rendered content can extend past its base.h notional bottom edge into the space of whichever block follows it in the template. The follower then overlays the overflowed text.
- **Fix:** Elevate `zIndex: 100` on the currently selected `GestureBlock` so it renders above every other block while selected. Unselected blocks stay at `zIndex: 0`. This doesn't push siblings out of the way (template layout logic would be needed for that) but stops the visual clipping — user can see their bumped text in full and decide whether to drag the next block down.
- **Commit:** `a9c4fdb`
- **Test:** `MANUAL_TESTS.md` § Font bump + persistence (post-Phase B) test 2.

## BUG-015 — Opening a different recipe destroyed canvas customization
- **Found:** 2026-04-22 (device report, Bug 1 of 3)
- **Severity:** **High** — silent data loss across recipe switches. Block arrangement, sticker placement, step/ingredient text edits, template choice, and font choice for recipe A are all wiped when the user opens recipe B's editor.
- **Repro:** Open recipe A → Layout → Arrange Blocks → move several blocks. Exit. Open recipe B → Arrange Blocks → move blocks. Exit. Return to recipe A. ✅ Expect: A's arrangement restored. Actual (before fix): A shows default arrangement; previous moves wiped.
- **Root cause:** `canvasStore` only held one recipe's state at a time. `init(newRecipeId)` when the id changed reset `elements / blockOverrides / stepOverrides / ingOverrides` to empty and persisted that. The persistence layer had exactly one slot. Exactly the same pattern as BUG-014 for the drawing store, but with much broader data loss because it covered the entire canvas customization surface.
- **Fix:** Reshape `canvasStore` to a per-recipe map: `recipeStates: Record<recipeId, RecipeCanvasState>` where `RecipeCanvasState = { elements, blockOverrides, stepOverrides, ingOverrides, templateKey, recipeFont }`. Keep top-level fields as a working-copy mirror for the current recipe. Every mutation updates both the working copy AND the canonical map entry via a `commitRecipeState` helper. On `init(newRecipeId)`: snapshot the outgoing recipe's working copy back into `recipeStates`, then load the incoming recipe's entry (or create a fresh default set). Persist config bumped to `version: 4`; `migrate` seeds the new map with the v3 single-recipe entry so that recipe's customization survives the upgrade.
- **Commit:** `a9c4fdb`
- **Test:** `MANUAL_TESTS.md` § Font bump + persistence (post-Phase B) test 1.

## BUG-014 — Drawings destroyed when opening a different recipe
- **Found:** 2026-04-22 (code read)
- **Severity:** **High** — silent data loss across recipe switches. Whatever the user drew on recipe A is wiped the moment they open the editor on recipe B, with no warning.
- **Repro:** Open recipe A → Draw mode → scribble → Done. Open recipe B → Draw mode → draw briefly → Done. Return to recipe A → Draw mode. ✅ Expect: previous strokes still there. Actual (before fix): recipe A shows the empty default 3 layers, previous strokes gone from memory and from persisted storage.
- **Root cause:** `drawingStore` only kept one recipe's drawings at a time. Its shape was `{ recipeId, layers, activeLayerId }`. `init(newRecipeId)` when the id changed simply reset to `DEFAULT_LAYERS()` and persisted the new (empty) state, overwriting the previous recipe's layers in MMKV. There was no per-recipe map; the persistence layer had exactly one slot.
- **Fix:** Reshape the store to a per-recipe map: `drawings: Record<recipeId, { layers, activeLayerId }>`. Top-level `layers` / `activeLayerId` become a "working copy" mirror for the current recipe. Every mutation (commitStroke, addLayer, removeLayer, setActiveLayer, reorder, toggleVisible, setLayerOpacity, setLayerBlendMode, undo) updates both the working copy AND the canonical `drawings[recipeId]` entry. On `init(newRecipeId)`: snapshot the outgoing recipe's working copy back into `drawings`, then load the incoming recipe's layers (or create defaults). Persist config bumped to `version: 2`; the migrate function seeds the new `drawings` map with the v1 single-recipe entry so that recipe's drawings survive the upgrade.
- **Commit:** `8795b7d`
- **Test:** `MANUAL_TESTS.md` § Drawing persistence (post-Phase B) test 1.

## BUG-013 — Delete × on short blocks covered by right side handle
- **Found:** 2026-04-22 (phone test, Arrange Blocks mode)
- **Severity:** Medium (can't delete a short 1-line block like `tags` or a compact title via UI; only workaround is to reset all overrides)
- **Repro:** Editor → Layout → Arrange Blocks → select a 1-line tags block. Tap the × in the top-right corner → nothing happens. The right edge width-drag handle sits under the ×.
- **Root cause:** `BlockElement.tsx` rendered the delete `TouchableOpacity` **before** the side edge handles in JSX, so later siblings (the right handle `GestureDetector`) ended up on top in the stacking order. The side handle's `SIDE_HANDLE_HIT_SLOP = 18` extends the touch zone 18px in every direction, completely covering the 22×22 delete button on short blocks.
- **Fix:** Moved the delete `TouchableOpacity` to render **last** in the JSX tree (after both side handles) so it wins the stacking order. Bumped `del.zIndex` from 2 → 3 as belt-and-braces. Pushed the button further out (`top/right: -10 → -14`) so its visible bounds sit clear of the side handle bar.
- **Commit:** `14ef7bc`
- **Test:** `MANUAL_TESTS.md` § Editor stability (post-Phase E) test 3.

## BUG-012 — Text-heavy blocks jumped down 40–80px after template change
- **Found:** 2026-04-22 (phone test)
- **Severity:** Medium (looked like a layout bug; disoriented users during template comparison)
- **Repro:** Editor → Layout → change template (e.g. Classic → Journal). Blocks render at one position, then ~200ms later all text-heavy blocks (title / description / ingredients / method / tags) shift vertically — usually downward.
- **Root cause:** `BlockElement.onContentLayout` measures the actual rendered content height and (after a 200ms debounce) commits it to `blockOverrides[id].h` via `setBlockHeightSilent`. `useBlockResolver` then returned that measured value as the block's `h`. `StaticBlock`'s transform is `translateY: cy - h / 2`, so when `h` changed from the template's default to the measured value, the block re-translated. Templates' `getDefault(pw)` functions allocate generous default heights (e.g. `method` = `usable(pw) * 0.39`); the actual rendered step-list height is almost always smaller → new `translateY` = larger (less negative offset) → block's top edge moves DOWN.
- **Fix:** `useBlockResolver` now returns `base.h` (the template default) for text-heavy blocks regardless of any stored override. The persisted `ov.h` is ignored for positioning. `GestureBlock` still tracks the real content height via its own `measuredH` Reanimated shared value (local UI state, not persisted) so the selection ring and hit box are still accurate. Measurement is still committed but is now dead data for text-heavy blocks — could remove the write entirely in a follow-up perf pass; left in place to keep the surgical scope tight.
- **Commit:** `14ef7bc`
- **Test:** `MANUAL_TESTS.md` § Editor stability (post-Phase E) test 2.

## BUG-011 — Drawing strokes silently discarded after reload
- **Found:** 2026-04-22 (phone test — user reloaded the app and drawing stopped working)
- **Severity:** **High** — a core feature silently dropped every stroke after any app reload. Looked like "drawing is broken" with no error surfaced.
- **Repro:** Editor → Draw mode → draw a stroke. Works. Pull to refresh (or any Metro reload, or kill + relaunch). Return to the same recipe's editor → Draw → drag a stroke. Stroke appears briefly while dragging, then vanishes on release.
- **Root cause:** `drawingStore.ts` persists `recipeId` + `layers` via zustand `persist.partialize`, but **does not persist `activeLayerId`**. On rehydration, `activeLayerId` resets to its initial value (`null`). The editor's `initDrawing(recipeId)` runs but has an early return: `if (get().recipeId === recipeId) return` — so it never re-sets `activeLayerId`. Subsequently, the Pan gesture's `onBegin/onChange` correctly update local `livePoints` (hence the flash), but on release `commitStroke` checks `if (!activeLayerId || points.length < 2) return` — the null-check hits and the stroke is silently dropped.
- **Fix:** Two-part change in `drawingStore.ts`:
  1. `init(recipeId)` — when recipeId matches the stored value, still check if `activeLayerId` is null and restore it to the first layer's id if so. Makes `init` idempotent for a valid store shape.
  2. `partialize` — added `activeLayerId` so it survives reloads directly without relying on init's fallback.
- **Collateral defensive fix:** In `app/editor/[recipeId].tsx`, the outer `canvasTapGesture` (Gesture.Tap for empty-space deselect) now sets `.enabled(editorMode !== 'draw')`. Not the root cause, but removes a potential nested-gesture race with `SkiaCanvas`'s Pan gesture — there's nothing to deselect while drawing, so the outer tap serves no purpose in that mode.
- **Commit:** `14ef7bc`
- **Test:** `MANUAL_TESTS.md` § Editor stability (post-Phase E) test 1.

## BUG-010 — Paper pattern missing from exported PDF
- **Found:** 2026-04-22 (surfaced during Phase E review, confirmed against the export pipeline)
- **Severity:** **High** — user picks "lined" / "dotted" / "grid" on their cookbook; every printed page comes out blank paper. Directly breaks the gift-a-real-book value prop once print is wired up.
- **Repro:** Cookbook → ⚙︎ → Paper: Lined → Save. Export any recipe in that book to PDF. ✅ Expect lined background. Actual: blank paper, no lines.
- **Root cause:** `PaperPattern` is a `react-native-svg` component rendered in the React layer, **outside** the Skia surface. PDF export is `Skia.makeImageSnapshot()` → PNG → Puppeteer → PDF; the snapshot captures Skia layers only, so SVG patterns (and `<Text>` blocks) are dropped.
- **Two related risks even after the pattern is in the PDF:**
  1. **Alignment drift** — pattern rasterized at screen DPI under text rendered at print DPI can shift by a pixel or two per page.
  2. **Scale basis** — `PaperPattern` computes 8mm/5mm spacing from `canvasWidth` (screen pixels). Print renderer must derive spacing from A4 physical width (210mm), not screen width, or the density will be wrong on paper.
- **Deferred fix (Phase F of `.claude/plans/book-templates-paper-atomization.md`):** stop rasterizing the page. Move to a shared `RecipePage` JSON schema consumed by both renderers — the Expo editor keeps RN Text/SVG for live editing, the export Edge Function feeds the same JSON into an HTML/CSS template rendered by Puppeteer at 300 DPI. Paper pattern becomes a CSS `background-image` (SVG data URL, vector, sharp at any DPI); text is real HTML text (vector, selectable); strokes become SVG paths. All three share the same coordinate system so alignment is guaranteed.
- **Interim mitigation:** do not let users complete a Lulu order until Phase F ships. The Phase E UX is explicitly screen-only preview — note in `MANUAL_TESTS.md` § Phase E already warns testers not to expect pattern in PDF.
- **Commit:** —
- **Test:** Phase F scenario (to be added to `MANUAL_TESTS.md`): pick lined paper → export PDF → open in Preview → lines are crisp vectors at any zoom → text sits on the lines without drift across pages.

## BUG-009 — SecureStore crash when iOS is locked / app backgrounded
- **Found:** 2026-04-21 (phone test — error surfaced in Expo dev red-box)
- **Severity:** **High** (silent auth refresh crashes → user might lose session)
- **Repro:** Leave app idle for a while, lock the phone, return to app → red-box "Auto refresh tick failed. Calling the 'getValueWithKeyAsync' function has failed → User interaction is not allowed."
- **Root cause:** Supabase's `autoRefreshToken: true` runs a timer that tries to read the session from SecureStore. iOS keychain rejects reads when the device is locked or the app is not active.
- **Fix:** Added `AppState` listener in `src/api/client.ts` that calls `supabase.auth.startAutoRefresh()` on `active` and `stopAutoRefresh()` on any other state. Canonical Supabase React Native pattern.
- **Commit:** `08ac9f5`
- **Test:** **TODO add to `MANUAL_TESTS.md`**:
  1. Open app + sign in.
  2. Lock the phone for 60 seconds.
  3. Unlock → return to app.
  4. ✅ Expect: no red-box, session still valid, queries refetch successfully.

---

## How to use this file

**When you find a bug on the phone or in review:**
1. Add a row to the summary table with the next `BUG-NNN` id.
2. Write the detail section below — at minimum: severity, repro, root cause, fix (and commit SHA once landed), which test scenario should cover it.
3. If there's no existing test scenario, add a `**TODO**` note pointing at `MANUAL_TESTS.md` — future QA pass or test automation starts from this list.
4. Link from the plan's "Phase X follow-up bugs" section to the IDs here.

**Severity guide:**
- **High** — data loss, auth break, core feature doesn't work. Fix before next commit.
- **Medium** — UX blocker, workaround exists. Fix in the same session.
- **Low** — polish, edge case, visible only in dev/audit. Fix when touching that area.

**When automated tests get set up** (Jest for units, Detox/Maestro for e2e), use this file as the regression suite checklist. Every `✅ Fixed` row should have at least one test asserting the original repro no longer breaks.
