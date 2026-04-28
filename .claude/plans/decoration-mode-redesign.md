# Plan — Decoration mode (canvas editor) redesign

> Companion to `stickers-tab-redesign.md`. Same vacation timeline.

## Context

User uploaded a Figma comp (`Downloads/fb8197a3-...png`) showing a polished, cookbook-page-style **Decoration mode** (the recipe canvas editor at `/editor/[recipeId]`). The design lands several new affordances and reorganizes the mode hierarchy.

**Visual intent of the comp** (a "Grandma's Lemon Cake" recipe page): handwritten title in Caveat, lemon sticker top-left, blue gingham washi tape with "Made with love since 1972 ♥" note, polaroid photo of the cake with handwritten caption, ingredients + directions in handwritten lists, "Tip" and "Notes" paper-card stickers, botanical sprigs at the left margin, small flower polaroid bottom-right with washi tape. Embodies the marketing-brief gift outcome.

### Diff: design vs what ships today

| Design wants | Today | Gap |
|---|---|---|
| Top-bar title **"Decoration mode"** + handwritten subtitle "*Make it yours ♥*" | Recipe title only | Copy + visual refresh |
| **Redo** button next to Undo | Undo only | New feature (both stores need redo stack) |
| **4 mode tabs**: Layout / Stickers / Draw / **Layers** | 3 mode tabs (Layers is a panel inside Draw) | Promote Layers to top-level tab |
| Help (?) button | Already exists | — |
| **Bottom always-visible 4-button toolbar**: Auto decorate · Themes · Page style · Background | None — toolbar is mode-specific | New shell |
| **"Auto decorate"** as always-visible primary action | "Make me Sketch" in Stickers mode only | Relabel + reposition |
| **"Themes"** button | none | New — opens templates picker |
| **"Page style"** button | Paper type is cookbook-level only, no editor toggle | New — wires existing `PaperPicker.tsx` |
| **"Background"** button | Palette is cookbook-level only | New — per-recipe palette override |
| **TEMPLATE carousel** with "See all" link in Layout mode | Template picker exists, no "See all" | Visual polish |
| **FONT carousel** with "See all" link in Layout mode | Font picker exists | Visual polish |
| **ARRANGE BLOCKS row**: Bring forward / Bring to front / Send backward / Send to back / Align / Distribute | Arrange-Blocks toggle + Reset + Clear only | New — z-order + multi-select + align/distribute |
| **Recipe photo polaroid** with handwritten caption | No photo upload yet | Phase 8.5B/C territory |
| **"Tip" / "Notes" paper-card stickers with editable text** | No text-on-sticker type | New element kind |
| **Botanical sprigs as decoration** | We have `botanical/` pack PNGs (5 stickers) | Already shippable once registry wires Phase 1 of stickers-tab redesign |

## Decision: ship in four phases, only Phase 1 before vacation

| Phase | Effort | Goal | Pre-vacation? |
|---|---|---|---|
| **Phase 1 — Visual + structural refresh** | ~2 days | Top bar, 4-tab nav, bottom toolbar, "Auto decorate" rename, Page style + Background pickers | **Yes** |
| **Phase 2 — Z-order + redo** | ~2 days | Redo across both stores; Bring forward / Send back actions in Arrange Blocks row | Tight — vacation-doable if Phase 1 of editor + Phase 1+2 of stickers-tab fit | 
| **Phase 3 — Multi-select + align/distribute** | ~3 days | Tap-and-drag multi-select; align (L/C/R/T/M/B) + distribute (H/V) actions | **No — post-vacation v1.1** |
| **Phase 4 — Recipe photo + Note/Tip stickers** | ~1 week+ | Photo upload + polaroid frames (Phase 8.5B/C); Note + Tip text-on-paper sticker types | **No — post-vacation v1.1** |

**Strong recommendation**: do **Phase 1 only** before vacation, since the user is also doing Phase 1+2 of the stickers-tab redesign (4 days) and Apple Sign In setup + Railway deploy + lawyer engagement (variable). Editor Phase 1 (2 days) gets the visual look matching the design without functional dependencies. Phase 2/3/4 land post-vacation.

---

## Phase 1 — Editor visual + structural refresh (~2 days)

### 1A. Top bar (~2h)

`app/editor/[recipeId].tsx` — top bar block (lines 271–298):

Today:
- ✕ close · recipe title · ↩ undo · Done

Design:
- ← back · "Decoration mode" (Fraunces) + "Make it yours ♥" (Caveat) centered · ↩ undo · ↪ redo · Done

Changes:
- Replace ✕ with ← (Feather `chevron-left`)
- Two-line centered title block: line 1 "Decoration mode" (Fraunces 18px, ink), line 2 "Make it yours ♥" (Caveat 13px, inkSoft, with a tiny pink heart emoji at end OR a small sticker)
- Hide the recipe title in the top bar (it's already prominent on the canvas)
- Add Redo button between Undo and Done
- Done button keeps its terracotta + spinner-while-saving behavior

The recipe-title block (currently the `topTitle` style line 279) gets repurposed for the static "Decoration mode / Make it yours" text. Selectively: when the recipe title is also empty (rare), maybe keep showing it on the canvas — but for v1 the canvas always renders the title via the page template, so we don't need it twice.

### 1B. Mode tabs: 3 → 4 (~3h)

`app/editor/[recipeId].tsx` — `EditorMode` type + mode-tab row (lines 37, 400–429):

```typescript
// Was:
type EditorMode = 'stickers' | 'draw' | 'layout';
// Now:
type EditorMode = 'layout' | 'stickers' | 'draw' | 'layers';
```

Tab rendering: matches design pill style — 4 inline tabs across the top of the bottom panel:
- **⊞ Layout** (sage green pill when active)
- **✱ Stickers**
- **✏ Draw**
- **▤ Layers** (NEW — graduate from sub-panel inside Draw)
- **?** help button (right side)

When `editorMode === 'layers'`:
- Render `LayerPanel` inline in the bottom panel area (instead of as overlay-on-Draw-mode)
- Remove the "Layers" button from `DrawingToolbar.tsx` (since the tab now does it)
- LayerPanel today shows drawing layers only — Phase 2 expands to show stickers + blocks too. For Phase 1, ship as drawings-only with a subtitle "Drawing layers" so users understand the scope.

### 1C. Bottom always-visible toolbar (~3h)

Below the mode-specific panel (and above the safe-area), render a **persistent 4-button row** in EVERY mode:

| Button | Icon | Action | Notes |
|---|---|---|---|
| **Auto decorate** | `feather/star` (active state shows sparkle) | Calls existing `MakeMeSketchButton` mutation flow | Active highlighted with terracotta when last successful sketch was within 5s; otherwise cream pill |
| **Themes** | `feather/grid` | Opens a TemplatePicker modal showing all 6 templates as full-card previews + "Save as default for this cookbook" toggle | New — modal-style, expands current inline picker |
| **Page style** | `feather/layout` | Opens a PaperPicker modal (4 paper types: blank / lined / dotted / grid) with per-recipe override option | Wires `src/components/canvas/PaperPicker.tsx` which exists but isn't currently surfaced in editor |
| **Background** | `feather/droplet` | Opens a PalettePicker modal — 4 palettes (terracotta / sage / blush / cobalt) with per-recipe override | New per-recipe palette override (today palette is per-cookbook only) |

Implementation notes:
- All 4 buttons render in every mode. They DO NOT change the mode tab — they open modals.
- The "Auto decorate" button replaces the dedicated MakeMeSketch button INSIDE Stickers mode. So in Stickers mode the panel just shows the sticker tray pack tabs + tile grid.
- Modal for Themes/Page-style/Background: bottom-sheet style (matches existing PackDetailScreen modal pattern). 70% screen height.
- Per-recipe overrides for paper-type and palette need new client store fields:
  - `useCanvasStore`: add `paperTypeOverride: PaperType | null` and `paletteOverride: PaletteName | null` (persisted via existing MMKV adapter)
  - Render: when override set, use it; else fall back to `cookbook.paper_type` / `useThemeStore.palette`
  - Persistence: per-recipe in canvas store keyed by `recipeId`

### 1D. Layout mode panel polish (~2h)

When `editorMode === 'layout'`, the panel content shows:

```
┌─────────────────────────────────────────┐
│ TEMPLATE                  See all  →    │
│ [Classic][Photo Hero][Minimal][Two Col] │
├─────────────────────────────────────────┤
│ FONT                      See all  →    │
│ [Aa Caveat][Aa Marck][Aa Bad][Aa Amat] │
├─────────────────────────────────────────┤
│ ARRANGE BLOCKS                          │
│ [Forward][To front][Backward][To back]  │
│ [Align    ][Distribute]                 │
└─────────────────────────────────────────┘
```

For Phase 1: render the visual structure but **keep ARRANGE BLOCKS buttons disabled with a "Coming soon" tooltip**. Phase 2 wires them.

The "See all" links open a full-screen template/font browser (modal, similar to PackDetailScreen).

### 1E. Redo button (Phase 1A enables this; full implementation is Phase 2)

For Phase 1 ship the button visual in the top bar but **disabled with a tooltip**. Phase 2 wires the redo stack.

### Phase 1 verification

- `npx tsc --noEmit` clean.
- Open editor → 4 tab pills visible (Layout / Stickers / Draw / Layers). Tap Layers → drawing layers list renders inline.
- Auto decorate / Themes / Page style / Background buttons visible at bottom in all 4 modes. Tap each:
  - Auto decorate → MakeMeSketch flow
  - Themes → modal with 6 templates
  - Page style → modal with 4 paper types
  - Background → modal with 4 palettes
- Per-recipe paper-type override persists across editor close + reopen
- Per-recipe palette override applies inline (canvas re-renders with new accent color)
- Top bar shows "Decoration mode" / "Make it yours ♥" instead of recipe title
- Undo button works; Redo is visible-but-disabled
- ARRANGE BLOCKS row visible-but-disabled

### Phase 1 commit shape

Three commits:
1. `Editor — top bar redesign (Decoration mode / Make it yours) + redo placeholder`
2. `Editor — promote Layers to 4th mode tab`
3. `Editor — bottom toolbar (Auto decorate / Themes / Page style / Background) with per-recipe paper + palette overrides`

---

## Phase 2 — Z-order + redo (POST-VACATION recommended)

### 2A. Redo support across both stores (~half day)

`src/lib/canvasStore.ts` + `src/lib/drawingStore.ts`:
- Today: `pushSnap` pushes onto `undoStack`; `undo()` pops from undo
- Add `redoStack` and:
  - `undo()` also pushes the current state onto redoStack before popping undoStack
  - `redo()` pops redoStack and applies, pushing the popped onto undoStack
  - Any new mutation clears redoStack
- Persist redoStack alongside undoStack via MMKV (max 50 entries)
- Editor top bar: enable Redo button when `redoStack.length > 0`

### 2B. Z-order actions in Arrange Blocks row (~1 day)

`src/components/canvas/ArrangeBlocksRow.tsx` (new component, extracted from current inline UI):
- 4 z-order buttons: Bring forward / Bring to front / Send backward / Send to back
- Each operates on `selectedId`
- For stickers: update `zIndex` field; reorder sortedElements
- For blocks: similar via `blockOverrides[blockId].zIndex` (new field on `BlockOverride`)
- Disabled when nothing selected

`canvasStore` actions: `bringForward`, `bringToFront`, `sendBackward`, `sendToBack` — each takes an element id, computes new z-index relative to siblings.

### 2C. Layers panel covers stickers + blocks (~half day)

`src/components/canvas/LayerPanel.tsx`:
- Today: drawing layers only
- Expand: list all "layers" — drawings + stickers + blocks — with type icons. User can reorder, hide, delete from one place.
- Each row shows: type icon (drawing / sticker / block), name (block label, sticker name, "Drawing layer N"), visibility toggle, opacity (drawings only), reorder ↑↓.

### Phase 2 commit shape

Two commits: redo support; z-order + layer-panel-unified.

---

## Phase 3 — Multi-select + align/distribute (POST-VACATION v1.1)

### 3A. Multi-select (~1 day)

- Tap-and-hold on first sticker/block → enters select mode (visual: dashed outline)
- Subsequent taps add/remove to selection
- Tap empty paper exits select mode
- `canvasStore.selectedIds: Set<string>` (replacing or alongside `selectedId`)
- Bulk actions toolbar appears when 2+ selected

### 3B. Align actions (~1 day)

- 6 align operations: left, center-h, right, top, center-v, bottom
- Compute bounding box of selection, snap each element to the relevant edge

### 3C. Distribute actions (~1 day)

- 2 distribute operations: horizontal, vertical
- Requires 3+ selected items
- Equal-space-between algorithm

---

## Phase 4 — Recipe photo + Note/Tip stickers (POST-VACATION, overlaps Phase 8.5B/C)

### 4A. Recipe photo upload + polaroid frame (~5 days)

Per Phase 8.5B/C in PLAN.md. Adds a `photo` element type to `CanvasEl` discriminated union, photo bucket, polaroid frame variants.

### 4B. Note + Tip text-on-paper stickers (~2 days)

New element kind: `note`
- Visual: paper-card sticker with editable Caveat text overlay
- Variants: Note (cream paper) / Tip (terracotta accent)
- Tap to enter edit mode (Modal with TextInput, save on close)
- 80-char limit per note for visual sanity

---

## Critical files (Phase 1 only)

```
NEW (Phase 1):
  src/components/canvas/EditorBottomToolbar.tsx       # Auto decorate + 3 picker buttons
  src/components/canvas/ThemesModal.tsx               # Templates picker, modal
  src/components/canvas/PageStyleModal.tsx            # PaperPicker wrapped in modal
  src/components/canvas/BackgroundModal.tsx           # Palette picker, modal

CHANGED (Phase 1):
  app/editor/[recipeId].tsx                           # Top bar + 4-tab + bottom toolbar mount
  src/lib/canvasStore.ts                              # paperTypeOverride + paletteOverride per recipe
  src/components/canvas/DrawingToolbar.tsx            # Remove Layers button (now in tab)
  src/components/canvas/LayerPanel.tsx                # Inline rendering when in 'layers' mode
  src/components/canvas/MakeMeSketchButton.tsx        # Reposition (or absorb into bottom toolbar)

REUSE (no change Phase 1):
  src/components/canvas/PaperPicker.tsx               # Already exists, just wire the modal
  src/components/canvas/TemplatePicker.tsx            # Wraps existing
  src/components/canvas/FontPicker.tsx                # No change Phase 1
  src/components/canvas/BlockElement.tsx              # No change Phase 1 (Phase 2 adds z-order)
```

## Out of scope

- Phase 2/3/4 (post-vacation)
- Recipe photo upload (Phase 8.5B/C)
- Note/Tip text stickers (Phase 8.5B/C addition)
- "See all" template/font full-screen browser (Phase 1 ships with inline carousel as is)
- Updating BACKEND.md schema for new sticker types

## Verification

1. Build new TestFlight via `eas build --platform ios --profile production --auto-submit`
2. Editor's 4 mode tabs render and switch correctly
3. Bottom toolbar's 4 modals open + close cleanly
4. Per-recipe palette + paper-type overrides survive editor close + reopen
5. ARRANGE BLOCKS visible-but-disabled with "Coming soon" tooltips
6. Existing functionality still works: Make me Sketch, sticker drag, block arrange, drawing, undo, save thumbnail to scrapbook view
7. `git diff --stat` for the 3 Phase 1 commits touches only the files in the Critical-files list — no scope creep into Phase 2/3/4

## Open questions for user

1. **Phase priority during vacation**: Phase 1 stickers-tab redesign + Phase 1 editor redesign together = ~3 days. Add Phase 2 of either = ~6 days. Ship which? Recommend: Stickers-tab Phase 1+2 + Editor Phase 1 only (~5 days) — rest is v1.1.
2. **Per-recipe palette override**: previously palette was cookbook-level for consistency. Per-recipe override means a single cookbook could have recipes in multiple accent colors. UX question: does that fragment the gift book's visual cohesion? Or is per-recipe expressiveness more valuable?
3. **Page style is per-recipe or per-cookbook**: today paper_type is per-cookbook. Design's "Page style" button on every recipe implies per-recipe. Same UX trade-off as palette.
4. **"Auto decorate" placement**: the design shows it in the bottom toolbar always-visible. But the existing MakeMeSketchButton has paywall + quota states baked in (see MakeMeSketchButton.tsx). Putting it in a small button in the bottom toolbar may need re-doing the paywall/quota UX. Recommend: in Phase 1 ship the bottom-button style but preserve existing paywall/quota states (just smaller pill).
