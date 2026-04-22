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
