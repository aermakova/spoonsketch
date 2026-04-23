# Bugs found — pass 2 (runtime behaviour only)

Second-pass review focused on *bugs* — things that misbehave at runtime — rather than style, rules, or refactor opportunities. Written after the first-pass review in `CODE_REVIEW.md` had its R1–R14 fixes landed.

Format: each bug has **file:line**, repro, root cause, impact, and a suggested fix.

---

## 🐛 B1 — Sticker undo doesn't visually revert the drag

**Files:** `src/components/canvas/CanvasElement.tsx:26–31`, `app/editor/[recipeId].tsx:300`

**Repro:**
1. Open a recipe with a sticker, or drop one via the tray.
2. Drag the sticker from (100, 200) to (300, 400). Release.
3. Tap the ↩ undo button in the top bar (sticker undo path).

**Expected:** sticker snaps back to (100, 200).
**Actual:** sticker visually stays at (300, 400). The underlying data in Zustand *has* reverted — if you close and reopen the editor, or trigger any other path that remounts CanvasElement, the correct (100, 200) position reappears.

**Root cause:** `CanvasElement` reads its shared values as `useSharedValue(el.x)` etc. on mount. `useSharedValue`'s initializer only runs once — subsequent renders with new `el.x` don't update the shared values. The animated transform (`translateX: x.value - SIZE/2`) continues to use the stale `x.value` from the gesture.

The editor keys `CanvasElement` by `el.id` only (not `${el.id}-${layoutResetVersion}`), so undo's bump of `layoutResetVersion` in `canvasStore` doesn't cause a remount here. (`BlockElement` doesn't have this bug because `PageTemplates` uses `elKey = "${id}-${ver}"` as its key.)

**Impact:** undo is broken for the sticker path. This is the most user-visible editor guarantee ("make a mistake, tap undo"). The data model stays consistent, but the screen lies to the user.

**Suggested fix — option A (cheapest):** add a `layoutResetVersion` prop to `CanvasElement` and include it in the key in the editor:

```tsx
<CanvasElement
  key={`${el.id}-${layoutResetVersion}`}
  ...
/>
```

Undo bumps layoutResetVersion → React sees a new key → full remount → shared values re-init from the reverted `el.x`/`el.y`.

**Suggested fix — option B (more invasive, preserves any in-flight animations):** add a sync effect inside `CanvasElement`:

```tsx
useEffect(() => {
  x.value = el.x;
  y.value = el.y;
  rot.value = el.rotation;
  sc.value = el.scale;
}, [el.x, el.y, el.rotation, el.scale, x, y, rot, sc]);
```

This runs on every prop change. Must be guarded so it doesn't clobber mid-gesture values — easy path is to skip the sync when a gesture is active (track via a ref). Option A is simpler and matches how BlockElement handles the same class of problem.

---

## 🐛 B2 — Recipe Detail's Scrapbook view shows empty canvas for any non-current recipe

**File:** `app/recipe/[id].tsx:36–70`

**Repro:**
1. Open Recipe A → Decorate → add stickers / change template → Done.
2. Open Recipe B → Decorate → any change → Done (or just enter the editor briefly).
3. Navigate to Recipe A's detail → tap the **Scrapbook** toggle.

**Expected:** Recipe A's scrapbook preview shows its stickers + chosen template + drawings.
**Actual:** empty canvas, default Classic template, no stickers, no drawings. The customization is still stored — opening Recipe A's editor shows everything intact.

**Root cause:** `ScrapbookView` reads state from the top-level "working copy" slots of the Zustand stores (`elements`, `templateKey`, `recipeFont`, `blockOverrides`, …), then gates them behind `canvasRecipeId === recipe.id` and `drawingRecipeId === recipe.id`. That check is only true for the *last recipe opened in the editor*. For any other recipe, it falls through to empty/default.

The per-recipe state *does* live in `recipeStates[recipe.id]` (canvasStore) and `drawings[recipe.id]` (drawingStore), but the detail view doesn't consult those maps.

**Impact:** the Clean/Scrapbook toggle stops being useful the moment you've touched a second recipe. This is especially painful for users with multiple recipes — the Scrapbook view's whole point is "show me what this will look like printed" and it shows the wrong thing.

Note: `exportRecipePdf.ts` (the actual PDF export helper) reads from `recipeStates[recipe.id]` / `drawings[recipe.id]` correctly, so the **exported PDF is right** while the on-screen preview is wrong. Double-inconsistency: the user sees an empty scrapbook, taps Export PDF, gets a richly-decorated PDF.

**Suggested fix:** read from the per-recipe map directly:

```tsx
// at the top of ScrapbookView
const canvasRecord = useCanvasStore(s => s.recipeStates[recipe.id]);
const drawingRecord = useDrawingStore(s => s.drawings[recipe.id]);

const pageElements = canvasRecord?.elements ?? [];
const templateKey = canvasRecord?.templateKey ?? cookbook?.default_template_key ?? 'classic';
const recipeFont = canvasRecord?.recipeFont ?? cookbook?.default_recipe_font ?? 'caveat';
const blockOverrides = canvasRecord?.blockOverrides;
const stepOverrides = canvasRecord?.stepOverrides;
const ingOverrides = canvasRecord?.ingOverrides;

const drawingLayers = drawingRecord?.layers ?? [];
```

Render SkiaCanvas when `drawingLayers.length > 0` rather than via the working-copy id check. Same pattern already used by `exportRecipePdf.ts` — the two sites should agree.

---

## 🐛 B3 — Table of Contents page numbers are wrong

**File:** `app/book/[cookbookId].tsx:24–30`

**Repro:**
1. Create a cookbook with a Cover + Table of Contents + Recipe A + Recipe B (in that order).
2. Tap the TOC page in the book builder.

**Expected:** Recipe A → page 3, Recipe B → page 4 (they're actually the 3rd and 4th pages of the book).
**Actual:** Recipe A → page 1, Recipe B → page 2.

**Root cause:**

```tsx
const entries = pages
  .filter(p => p.page_type === 'recipe')
  .map((p, i) => ({ title: p.recipe_title ?? p.title ?? 'Recipe', pageNum: i + 1 }));
```

`i` is the *index within the filtered recipes*, not the index within the whole book. Cover and TOC pages push recipes further down the book, so `i + 1` always understates the real page number.

**Impact:** the TOC modal (and anyone building the printed version of this page later) will print wrong page references. Small now, significant the moment we have PDFs flowing to Lulu.

**Suggested fix:**

```tsx
const entries = pages
  .map((p, idx) => ({ ...p, bookPageNum: idx + 1 }))
  .filter(p => p.page_type === 'recipe')
  .map(p => ({ title: p.recipe_title ?? p.title ?? 'Recipe', pageNum: p.bookPageNum }));
```

If cover + TOC should be excluded from numbering (common in print), subtract them from the index after the book-position assignment.

---

## 🐛 B4 — Partial reorder when `reorderBookPages` mid-request errors

**File:** `src/api/bookPages.ts:49–61`

**Repro:**
1. Drag to reorder 10+ pages in a cookbook.
2. Simulate a Supabase hiccup mid-request (put the phone in airplane mode as the operation starts, or just wait for a real flaky moment).

**Expected:** all-or-nothing — either every position update lands or none do; the UI's optimistic state rolls back on failure.
**Actual:** the code fires one UPDATE per row via `Promise.all`. If the 3rd UPDATE fails, the outer `await` throws, but requests 4–10 are *already in-flight*. They continue and complete. The final DB state has some new positions and some old, in whatever order the requests resolved.

The UI's `onError` rollback (the optimistic cache revert in the mutation) runs too, so the client briefly reverts to the pre-drag order. Then `onSettled` invalidates the query → refetch → pulls the *actual* half-applied DB state → UI now shows a state that matches neither the drag nor the original order.

**Impact:** rare (requires flaky network) but highly confusing. Users would see pages reordering into patterns they never intended.

**Suggested fix:** replace with a single atomic call. Either:

1. **Postgres function** (best):
   ```sql
   create or replace function reorder_book_pages(p_ids uuid[], p_positions int[])
   returns void language plpgsql security invoker as $$
   begin
     update public.book_pages bp
        set position = p_positions[array_position(p_ids, bp.id)]
      where bp.id = any(p_ids);
   end;
   $$;
   ```
   Call via `supabase.rpc('reorder_book_pages', { p_ids, p_positions })`. One statement, one transaction — atomic.

2. **Bulk upsert with merge** — less clean but avoids a new migration.

3. **Defensive fallback** if neither of the above is worth the migration: keep the `Promise.all`, but on any error also `await qc.refetchQueries(['book-pages', cookbookId])` and let the user re-drag. Mitigates the "half-stuck state" at the cost of an extra refetch.

---

## 🐛 B5 — `addBookPage` backfill errors are silently swallowed

**File:** `src/api/bookPages.ts:33–39`

**Repro:**
1. Create a recipe with `cookbook_id = null` (via FAB → Type tab).
2. Add it as a page to a cookbook.
3. Make the backfill UPDATE fail — easiest is to simulate an RLS policy rejection, or temporarily network-fail that specific request via a debug tool.

**Expected:** the whole "add page" flow either succeeds (recipe linked + page inserted) or fails cleanly.
**Actual:** the page-insert succeeds, then the backfill `supabase.from('recipes').update({cookbook_id}).eq('id', recipeId).is('cookbook_id', null)` runs and its `error` is never checked. Returns `data` (the book page) as success. Recipe's `cookbook_id` stays null.

```ts
if (input.page_type === 'recipe' && input.recipe_id) {
  await supabase
    .from('recipes')
    .update({ cookbook_id: input.cookbook_id })
    .eq('id', input.recipe_id)
    .is('cookbook_id', null);   // no error check, no return value used
}
```

Downstream: the editor's hydration logic walks `per-recipe override → cookbook default → fallback`. Without the backfilled `cookbook_id`, the cookbook default never applies to this recipe — user sees default Classic template even though the cookbook's default is Journal.

**Impact:** silent inconsistency. Hard to notice; hard to reproduce; the symptom shows up hours later when the user wonders why their cookbook default didn't stick.

**Suggested fix:** check the error. Either fail the whole operation:

```ts
const { error: backfillErr } = await supabase
  .from('recipes')
  .update({ cookbook_id: input.cookbook_id })
  .eq('id', input.recipe_id)
  .is('cookbook_id', null);
if (backfillErr) throw new ApiError(backfillErr.message, backfillErr.code);
```

…or log to analytics and continue, but surface the failure somewhere observable. Don't `await` and discard.

---

## 🐛 B6 — Cookbook-level Export button says "Coming soon" although PDF export ships

**File:** `app/book/[cookbookId].tsx:467–471`

**Repro:** open any cookbook → tap **Export** in the header.

**Expected:** export the whole cookbook as a PDF, or at minimum direct the user to the per-recipe export path.
**Actual:** `Alert.alert('Coming soon', 'PDF export will be available in a future update.')`.

Phase F shipped per-recipe PDF export via `exportRecipePdf` in `src/lib/exportRecipePdf.ts`, reachable from the Recipe Detail → Scrapbook → ⤓ Export PDF button. The cookbook-level export was always going to come later (it needs page merging + dedication pages + Lulu geometry), but the stub is a dead-end from the user's viewpoint.

**Impact:** user who wants a printed cookbook hits this button, sees "Coming soon", and doesn't realise they can export individual recipes. Feature discovery lost.

**Suggested fix — cheapest:** rename the button to **Export recipe → …** with a dropdown (one entry per recipe page) or a half-sheet picker. Or remove the button entirely until the real cookbook-level export lands in Phase 9.

Alternate — keep the button but change the alert text:

```
Coming soon — one-tap cookbook PDF is in Phase 9.
For now, tap any recipe's Scrapbook view to export that page as a PDF.
```

Small but closes the loop.

---

## 🐛 B7 — `deleteBookPage` doesn't renumber remaining pages

**File:** `src/api/bookPages.ts:44–47`

**Repro:**
1. Cookbook with pages at positions [0, 1, 2, 3, 4].
2. Delete the middle page (position 2).

**Expected:** remaining pages renumber to [0, 1, 2, 3] (or the `position` column is fine with gaps as long as the order is stable).
**Actual:** remaining pages stay at [0, 1, 3, 4]. Sorting by `position` keeps order correct, so this *only* matters if anywhere in the codebase we assume positions are dense.

Current codebase mostly treats positions as opaque sort keys. **`handleAddPage` uses `position: pages.length`** (line 372) — which works as long as `pages.length` is greater than the max existing position. With gaps, this still holds. Fine.

So this is technically latent, not active. Worth knowing because the next developer to write "book page at position N" logic will hit it.

**Impact:** none today. Bug-in-waiting.

**Suggested fix (defer):** either compact on delete:

```ts
export async function deleteBookPage(id: string): Promise<void> {
  const { data: deleted, error: delErr } = await supabase
    .from('book_pages')
    .delete()
    .eq('id', id)
    .select('cookbook_id, position')
    .single();
  if (delErr) throw new ApiError(delErr.message, delErr.code);
  // Renumber siblings above the deletion point
  // ... (probably via a Postgres function; same reasoning as B4)
}
```

…or leave the gaps and assert everywhere that positions are opaque. Either is fine; the current code hovers between the two assumptions.

---

## 🐛 B8 — Editor Alert can fire on unmounted screens

**File:** `app/editor/[recipeId].tsx:86`

**Repro:**
1. Enter the editor for a recipe.
2. Change the template (fires `upsertCanvasMutation`).
3. Before the mutation resolves, tap Done → navigate away to another screen.
4. Bring the network down so the mutation fails.

**Expected:** either the mutation's failure is retried silently, or the user is prompted in a way that makes sense for their current context.
**Actual:** `onError: (e: any) => Alert.alert('Save failed', e?.message ?? 'Could not save your changes.')` fires regardless of current screen. The user is reading their Recipes list when an "Editor save failed" alert pops up with no context of what it refers to.

TanStack Query keeps mutations alive across unmount by default (good for preventing silent drops), but the error handler is context-unaware.

**Impact:** confusing modal interruption. Doesn't corrupt data — the Zustand + MMKV path is local; only the server-side `recipe_canvases` row is out-of-sync, and the next editor open resolves it.

**Suggested fix:** include the recipe title in the alert copy and/or navigate back to the editor on retry:

```tsx
onError: (e: any) => Alert.alert(
  `Couldn't save ${recipe?.title ?? 'recipe'} edits`,
  'Reopen the recipe to try again.',
),
```

Or: drop the Alert entirely on mutation failure and push a passive error boundary / toast. The server row is recreated on the next edit anyway.

---

## 🐛 B9 — `useSharedValue` initialized from `canvasStore` values never syncs on recipe switch within a mounted editor

**File:** `src/components/canvas/CanvasElement.tsx:26–31` — related to B1

**Repro:** this is a deeper version of B1.

1. Editor mounted for Recipe A with stickers.
2. Navigate to Recipe B without unmounting the editor (there's no current path that does this, but the editor screen uses `useLocalSearchParams` and Expo Router reuses components for same-route navigation with different params).

**Expected:** stickers re-render at Recipe B's coordinates.
**Actual:** stickers render at Recipe A's coordinates because shared values initialized on the first mount never re-read from props.

**Impact:** today, `useLocalSearchParams<{ recipeId: string }>()` causes a remount in most navigation flows we use, so B9 is latent. If we add any "swipe between recipes in the editor" navigation (the current editor doesn't support this but it'd be a natural Phase 10 addition), B9 becomes active instantly.

**Suggested fix:** same as B1 — key CanvasElement by `"${el.id}-${layoutResetVersion}"` or include a sync `useEffect`.

---

## 🐛 B10 — Layer-panel settings (visibility, opacity, blend, reorder) are not undoable

**File:** `src/lib/drawingStore.ts:165–184`, `151–163`

**Repro:**
1. Draw on a layer.
2. Accidentally tap the visibility toggle (◉ → ○).
3. Tap ↩ undo.

**Expected:** visibility flips back on.
**Actual:** undo pops the last stroke instead.

`toggleVisible`, `setLayerOpacity`, `setLayerBlendMode`, `reorderLayer`, `setActiveLayer` all `set(...)` without pushing a history snapshot. Only `commitStroke` and `removeLayer` push history.

**Impact:** minor but real — "I accidentally hid layer 2" is a normal user mistake and the menu has no per-row undo.

**Suggested fix:** decide — is this a feature or a bug? The plan file for Phase 5 didn't specify undo semantics for panel operations. Either:

- **Wire panel ops into history** — add `pushSnap` before each `set` in these handlers. Matches the "Cmd-Z undoes anything visible" expectation.
- **Document explicitly** — add a "settings changes are immediate and not undoable" note in the help sheet. Users still lose work to misclicks, but the mental model is clear.

My lean: wire them in. Two-line change per handler and it closes a whole class of support requests.

---

## Severity summary

| Bug | Severity | Device-visible today? |
|---|---|---|
| B1 sticker undo stale | 🔴 High | Yes — every drag-then-undo |
| B2 scrapbook empty on non-current recipe | 🔴 High | Yes — happens after any 2nd recipe edit |
| B3 TOC page numbers wrong | 🟡 Medium | Yes — every cookbook with a cover or TOC |
| B4 partial reorder on flaky network | 🟡 Medium | Rare (flaky net) |
| B5 addBookPage backfill silent | 🟢 Low | Rare (RLS/network) |
| B6 cookbook Export stub | 🟢 Low (UX) | Yes — every cookbook |
| B7 deleteBookPage gaps | 🟢 Latent | No |
| B8 stale editor Alert | 🟢 Low (UX) | Rare |
| B9 same-editor recipe switch | 🟢 Latent | No (unreachable today) |
| B10 layer panel ops not undoable | 🟢 Low | Yes — any misclick |

## Triage pick if you only fix a few

1. **B1** — sticker undo. One-line key change fixes it and restores the undo UX.
2. **B2** — scrapbook empty on non-current recipe. One component change. Big user-visible quality bump.
3. **B3** — TOC page numbers. Three-line change, prevents future print-order embarrassment.

B4 and B5 are worth filing but can wait until we see them in the field.
