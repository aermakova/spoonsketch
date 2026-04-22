# Bug log

Canonical record of bugs found during development, fixes, and the test scenarios that should cover them going forward. Every new bug gets an ID `BUG-NNN`, a short repro, the root cause, the commit that fixed it, and a line to the test scenario in `manual-device-tests.md`.

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

---

## BUG-001 — Double-submit creates duplicate cookbooks
- **Found:** 2026-04-21
- **Severity:** Medium (data integrity)
- **Repro:** Shelves → New → type title, pick color → tap **Create** 3× quickly → 3 cookbooks created with the same name.
- **Root cause:** `useMutation` fires once per `mutate()` call. No guard between tap and modal-close (which happens in `onSuccess`).
- **Fix:** Added `loading` prop to `ClayButton` (spinner + disable), `submitting` prop to form modals, `useSubmitGuard` hook for raw async handlers. Applied app-wide: cookbook create/edit, swipe-delete, sign-out, login, recipe create.
- **Commit:** `2922726` (Phase C + submit guard)
- **Test:** `manual-device-tests.md` § Phase C test 5.

## BUG-002 — Keyboard covers CookbookFormModal inputs
- **Found:** 2026-04-21
- **Severity:** Medium (UX blocker)
- **Repro:** Shelves → New → tap title field → keyboard rises over the input and color swatches.
- **Root cause:** Modal had no `KeyboardAvoidingView`.
- **Fix:** Wrapped in `KeyboardAvoidingView` with iOS `behavior="padding"`.
- **Commit:** `2922726`.
- **Test:** `manual-device-tests.md` § Phase C test 6.

## BUG-003 — Editor save failures silent
- **Found:** 2026-04-21
- **Severity:** Low (reveals itself as "lost changes" later)
- **Repro:** Airplane mode + change template in editor → no feedback, changes appear saved but weren't.
- **Root cause:** `upsertCanvasMutation` had no `onError`. TanStack keeps mutations alive across unmount so failures would never surface.
- **Fix:** Added `onError: (e) => Alert.alert('Save failed', e?.message)` + spinner on Done button + disabled close/Done while in-flight.
- **Commit:** `37e3618`.
- **Test:** `manual-device-tests.md` § Phase C test 7.

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
- **Test:** `manual-device-tests.md` § Phase C test 8 (passive — navigate all tabs, none crash). **TODO: add a dev-only "force crash" toggle in Me screen to assert the fallback UI renders.**

## BUG-006 — Keyboard covers recipe list in PageTypePicker
- **Found:** 2026-04-21 (phone test)
- **Severity:** Medium (UX blocker, identical pattern to BUG-002)
- **Repro:** Book Builder → **Add page → Recipe → Choose Recipe** → search input autofocuses, keyboard covers the entire recipe list.
- **Root cause:** `PageTypePicker` is a custom `Animated.View` bottom sheet at `position: absolute; bottom: 0`. `KeyboardAvoidingView` doesn't compose cleanly with absolute positioning, so we couldn't reuse BUG-002's fix.
- **Fix:** Added a second `Animated.Value` (`kbY`) driven by `Keyboard.addListener('keyboardWillShow'/'keyboardWillHide')`, combined with the entry/exit value via `Animated.add`. The sheet now slides up by keyboard height when the input focuses.
- **Commit:** `08ac9f5`
- **Test:** `manual-device-tests.md` § Phase C test 6 (expanded to all TextInput hosts).

## BUG-007 — Book Settings modal had no Save button
- **Found:** 2026-04-21 (phone test)
- **Severity:** Medium (UX confusion; user tapped template but couldn't tell if it saved)
- **Repro:** Book Builder → ⚙︎ → change template → no "Save" button visible; user doesn't know if change persisted.
- **Root cause:** Modal called `settingsMutation.mutate()` on every picker tap (optimistic update), but had no explicit Save action — only a backdrop-tap / ✕ close. The "coming soon" info box looked like a disabled button, compounding confusion.
- **Fix:** Reworked to draft state in the modal (`template`, `font` useState initialized from cookbook). Added explicit **Cancel** + **Save** buttons. Save fires `settingsMutation.mutate(patch)` with `onSuccess: closeModal`. Spinner on Save button while in-flight; disabled when no changes. "Coming soon" box restyled as a small footer hint.
- **Commit:** `08ac9f5`
- **Test:** `manual-device-tests.md` § Phase C test 1 + 3 (covers Save interaction; **TODO: add "open settings, change then Cancel → original values restored"**).

## BUG-008 — Book default never applied to recipes (missing FK link)
- **Found:** 2026-04-21 (phone test)
- **Severity:** **High** — core Phase C feature didn't work end-to-end
- **Repro:** Create cookbook with Journal default → Home → create recipe → open editor → still Classic (default fallback), not Journal.
- **Root cause:** Two independent paths linked recipes to cookbooks (`recipes.cookbook_id` FK + `book_pages` join table). `addBookPage` wrote only to `book_pages`, never backfilled `recipes.cookbook_id`. Editor hydration keyed off `recipe.cookbook_id` → null → cookbook query disabled → fell back to `'classic'`/`'caveat'`.
- **Fix:** `addBookPage` now backfills `recipes.cookbook_id` on first-add (only when currently null, so being added to a second book doesn't overwrite). Book builder's `addMutation` invalidates `['recipe', vars.recipe_id]` + `['recipes']` so the editor immediately sees the link.
- **Commit:** `08ac9f5`
- **Test:** `manual-device-tests.md` § Phase C test 1 (rewritten to include the "add as book page" step — which is the trigger for linkage).
- **Related risk:** if we ever want "recipe can belong to multiple books," this FK approach breaks. For v1 the home-book-wins model is correct. Revisit during Phase B if we generalize page types.

## BUG-009 — SecureStore crash when iOS is locked / app backgrounded
- **Found:** 2026-04-21 (phone test — error surfaced in Expo dev red-box)
- **Severity:** **High** (silent auth refresh crashes → user might lose session)
- **Repro:** Leave app idle for a while, lock the phone, return to app → red-box "Auto refresh tick failed. Calling the 'getValueWithKeyAsync' function has failed → User interaction is not allowed."
- **Root cause:** Supabase's `autoRefreshToken: true` runs a timer that tries to read the session from SecureStore. iOS keychain rejects reads when the device is locked or the app is not active.
- **Fix:** Added `AppState` listener in `src/api/client.ts` that calls `supabase.auth.startAutoRefresh()` on `active` and `stopAutoRefresh()` on any other state. Canonical Supabase React Native pattern.
- **Commit:** `08ac9f5`
- **Test:** **TODO add to `manual-device-tests.md`**:
  1. Open app + sign in.
  2. Lock the phone for 60 seconds.
  3. Unlock → return to app.
  4. ✅ Expect: no red-box, session still valid, queries refetch successfully.

---

## How to use this file

**When you find a bug on the phone or in review:**
1. Add a row to the summary table with the next `BUG-NNN` id.
2. Write the detail section below — at minimum: severity, repro, root cause, fix (and commit SHA once landed), which test scenario should cover it.
3. If there's no existing test scenario, add a `**TODO**` note pointing at `manual-device-tests.md` — future QA pass or test automation starts from this list.
4. Link from the plan's "Phase X follow-up bugs" section to the IDs here.

**Severity guide:**
- **High** — data loss, auth break, core feature doesn't work. Fix before next commit.
- **Medium** — UX blocker, workaround exists. Fix in the same session.
- **Low** — polish, edge case, visible only in dev/audit. Fix when touching that area.

**When automated tests get set up** (Jest for units, Detox/Maestro for e2e), use this file as the regression suite checklist. Every `✅ Fixed` row should have at least one test asserting the original repro no longer breaks.
