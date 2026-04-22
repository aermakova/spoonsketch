# Plan — Canvas zoom & pan in the Scrapbook editor

## Status
⏳ Not started — deferred until after Phases A + B of `book-templates-paper-atomization.md` (canvas atomization). Atomization touches `PageTemplates.tsx` heavily; zooming a page that's still being refactored means rewriting layout code twice.

## Why

The scrapbook canvas is fixed at `screenWidth − 48` (~342px on iPhone). At that size:
- Apple Pencil handwriting is cramped — users instinctively try to zoom in for dedication pages.
- Stickers land with finger-sized fidelity (~8pt hit target), not pixel-precise.
- Small text-heavy blocks (method steps, ingredients) are hard to re-arrange without misaiming.

Any sketchbook-style app users have used (Procreate, Concepts, GoodNotes, Freeform) ships with pinch-to-zoom. Not having it makes the editor feel toy-ish.

## Current architecture (what we're zooming)

`app/editor/[recipeId].tsx:244`: `ScrollView` (vertical scroll only) wraps a fixed-size `View` (`canvasWidth × canvasHeight`). Inside that View, layered z-bottom to z-top:
1. `PaperPattern` — react-native-svg, `pointerEvents="none"`
2. `PageTemplate` — RN View tree with `TouchableOpacity` and `GestureDetector` per block (drag/resize/font-bump)
3. `SkiaCanvas` — absolute-positioned, owns its own `GestureDetector` when `editorMode === 'draw'`
4. Sticker `CanvasElement`s — each with its own `GestureDetector` (pan/rotate/scale), `pointerEvents="none"` when disabled

All gesture handlers come from `react-native-gesture-handler` v2. Outer `canvasTapGesture` (editor) handles empty-tap deselect.

## Three shapes

### Shape 1 — Dedicated "Zoom mode" toggle (cheapest, ships in a day)
- Add a fourth mode tab next to Layout / Stickers / Draw: **Zoom** (🔍 icon).
- In Zoom mode:
  - All block/sticker/draw gestures suspended (`disabled` or `pointerEvents="none"` on each layer).
  - Canvas View wrapped in a new `GestureDetector` accepting `Gesture.Pinch()` + `Gesture.Pan()`.
  - Scale/translate tracked in a Reanimated shared value; applied via `transform`.
- Tap Zoom tab again → exit, but **keep the current zoom/translate** so user can edit at zoomed state.

Pros: zero interference with existing gestures; straightforward Reanimated transform; easy to reason about.
Cons: extra mental model — "why do I need to enter a mode just to zoom?" Not how Procreate works.

### Shape 2 — Always-on two-finger pinch (recommended long-term)
- Add a root-level pinch+pan gesture that runs `simultaneousWith` every child gesture.
- One-finger touches flow through to whichever element is under them (draw / sticker / block), same as today.
- Two-finger touches activate zoom/pan on the canvas View — no mode switch required.

Pros: matches Procreate/Concepts/Freeform. No extra UI. Natural on iPad with Pencil (one-finger = draw, two-finger = zoom).
Cons: gesture-handler's `simultaneousWith` needs to be wired across every `GestureDetector` in the tree. Pan-to-move-sticker vs pan-to-scroll-zoomed-canvas needs careful disambiguation (likely: single-pointer pan on a sticker → move sticker; two-pointer pan on canvas → pan view; single-pointer pan on empty canvas when zoomed → pan view). Debugging gesture conflicts on device is slow.

### Shape 3 — Use a library (`react-native-zoom-toolkit`, `react-native-image-zoom`)
- These libraries assume a static single child (image viewer use case). They break when the child has its own gestures.
- Verdict: not viable for an interactive canvas. Rule out.

## Recommendation

**Ship Shape 2** (always-on pinch), but only **after Phases A + B land**. Rationale:
- Atomization rebuilds every template's block tree. Doing zoom first means retuning all the `simultaneousWith` relationships when blocks change.
- Shape 1 (mode toggle) feels like a stop-gap users will outgrow within a week; not worth the dev time as a throwaway.
- Shape 2 is the right final state. Build it once, correctly, on the atomized tree.

**Rough scope:** ~1–2 days of focused work:
- Day 1: Reanimated shared values for `scale`/`translateX`/`translateY`, pinch+pan on a fresh `Gesture.Race(pinch, pan)` wired `simultaneousWith` every existing detector. Clamp scale 0.5×–4×. Reset button in toolbar.
- Day 2: Device testing — draw mode at 3× zoom, sticker drag at 2× zoom, block resize at 0.75× zoom, pan boundaries (don't let user fling the canvas offscreen). Fix whatever conflicts appear.

## Files affected

| File | Change |
|---|---|
| `app/editor/[recipeId].tsx` | Wrap canvas View in a new top-level `GestureDetector` (pinch + pan); apply `transform` from shared values; add Reset button. |
| `src/components/canvas/CanvasElement.tsx` | Sticker gesture detectors declare `.simultaneousWithExternalGesture(rootPinchGesture)`. |
| `src/components/canvas/BlockElement.tsx` | Same for block drag/resize detectors. |
| `src/components/canvas/SkiaCanvas.tsx` | Pan gesture declares simultaneous with root pinch. |
| `src/lib/canvasStore.ts` | *(Optional)* persist last-used zoom per-recipe so reopening the editor keeps the zoom level. |

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Pinch over a sticker triggers both "scale the sticker" and "scale the canvas" | Pinch gesture requires 2 pointers; sticker scale is a different handler requiring pointer count + a rotation component. Use `requireExternalGestureToFail` so canvas pinch wins when pointers land on canvas chrome, sticker scale wins when both pointers land on the sticker. |
| Pan-to-scroll fights pan-to-move at 1× zoom | At 1× zoom, canvas pan does nothing (translation clamped to 0). At >1×, canvas pan is empty-space pan only — stickers/blocks still grab one-finger touches via their own detectors. |
| Drawing at zoom: stroke coordinates | `SkiaCanvas` Pan gesture reports event.x / event.y in the View's local coords, which the `transform` has already scaled. Need to divide coords by current scale before passing to `beginStroke` so strokes land at canvas pixels, not view pixels. |
| PDF export at zoomed state | Export happens in Skia regardless of UI zoom. `makeImageSnapshot` reads from the unscaled surface. No change needed — already correct. |
| Paper pattern aliases at extreme zoom-out | SVG patterns scale fine. Minor visual shimmer at 0.5× is acceptable. |
| Undo includes zoom state? | No. Zoom is view state, not document state — never persisted to `blockOverrides`. Undo should not touch it. |

## When to ship

Sequence: A → B → (commit atomization) → this plan → Phase F (print contract).

Phase F (HTML/CSS renderer) needs the `RecipePage` JSON schema to be stable; zoom doesn't touch that schema (view state only), so F can proceed in parallel if the team grows.

## Open questions

1. Should we persist zoom level per-recipe, or always reset to 1× when opening the editor? (Leaning: always reset. Zoom is transient; persisting surprises users.)
2. Min/max scale — 0.5×–4× or 0.25×–8×? (Leaning: 0.5×–4×. More than 4× on a 342px canvas is meaningless — the image just pixelates. Sub-0.5× doesn't show more of the page because canvas is already the full page.)
3. Double-tap to reset zoom? (Feels discoverable and standard. Worth adding as a `Gesture.Tap().numberOfTaps(2)` in Shape 2.)
