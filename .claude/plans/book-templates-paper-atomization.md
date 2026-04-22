# Plan — Cookbook-level templates, per-field blocks, paper types

## Progress (updated 2026-04-21)

| Phase | Status | Notes |
|---|---|---|
| **A** — Description normalization | ✅ **Shipped** | Every template now has a movable `description` block; `schemaVersion: 2` gate clears stale overrides |
| **B** — Atomize every recipe field | ✅ **Shipped** | Every template now uses the 9-atom set; `schemaVersion: 3` migration clears v1/v2 overrides |
| **C** — Book-level template + font defaults | ✅ **Shipped** | Migration applied via dashboard; server-authoritative hydration wired |
| **D** — Cookbook-level section titles | ✅ **Shipped** | Migration applied; landed in commit `20330e7` |
| **E** — Paper type at cookbook level | ✅ **Shipped** | Initial landing `6eb9810`; pattern geometry polish + BUG-010 logged in follow-up commit |
| **F** — Print alignment contract | 🟡 **In progress** | Foundation (RecipePage JSON schema + serializer) landed; HTML renderer + Edge Function pending |

### Phase C — what's landed

- Migration `supabase/migrations/20260421000001_cookbook_template_font_defaults.sql`: adds `cookbooks.default_template_key`, `cookbooks.default_recipe_font`, `recipe_canvases.recipe_font`. **Applied via Supabase dashboard.**
- `src/types/cookbook.ts` — new `CookbookTemplateKey`, `CookbookFontKey` types; `Cookbook` + `CookbookInsert` extended.
- `src/api/recipeCanvases.ts` *(new)* — `fetchRecipeCanvas`, `upsertRecipeCanvas` for per-recipe overrides.
- `src/lib/canvasStore.ts` — new `hydrateTemplateAndFont` silent action; `setTemplateKey` now accepts an `onApplied` callback (fires only if user confirms the "reset arrangement" Alert) so the server write is gated on confirmation.
- `app/editor/[recipeId].tsx` — loads `recipe`, `recipe_canvases`, `cookbook` via TanStack Query; resolves template/font with precedence `per-recipe override → cookbook default → fallback`; picker `onSelect` handlers persist via `upsertCanvasMutation`.
- `app/book/[cookbookId].tsx` — gear ⚙︎ button in the header opens a Book Settings modal with `TemplatePicker` + `FontPicker` wired to an optimistic `updateCookbook` mutation.

### Cross-cutting fixes landed alongside Phase C

- **Keyboard avoidance** — `CookbookFormModal` in `app/(tabs)/shelves.tsx` was covered by the keyboard; wrapped in `KeyboardAvoidingView` (iOS `behavior="padding"`).
- **Double-submit guard (app-wide)** — new `loading` prop on `ClayButton` (spinner + disable), new `useSubmitGuard` hook for raw async handlers, every create/delete/save button now blocks second taps while a request is in flight. Sites fixed: cookbook create/edit modal, cookbook swipe delete, sign-out, login, recipe create, editor pickers already safe via upsert.

### Stability cleanup (landed 2026-04-21, commit `37e3618`)

- ✅ Editor save-in-flight UX: `Done` button spinner + disabled close/Done while `upsertCanvasMutation.isPending`; `onError` Alert surfaces silent failures.
- ✅ TanStack cache invalidation audit — fixed three gaps: shelves `updateMutation` and `deleteMutation` now invalidate `['cookbook', id]` + remove `['book-pages', id]`; book-builder `renameMutation` + `settingsMutation` now invalidate `['cookbooks']` too.
- ✅ RLS audit — `supabase/migrations/20260418000002_rls_and_auth.sql` uses row-level `auth.uid() = user_id` policies; new columns are auto-covered (no column-level restrictions). Clean.
- ✅ Error boundaries on every tab root — new `withErrorBoundary` HOC in `src/components/ui/ErrorBoundary.tsx`; applied to `app/(tabs)/index.tsx`, `shelves.tsx`, `elements.tsx`, `me.tsx`, `app/book/[cookbookId].tsx`, `app/recipe/create.tsx`. Editor and recipe detail already had one. `app/(tabs)/add.tsx` is a `<Redirect>` stub, skipped.

### Phase C follow-up bugs (found during device test 2026-04-21)

All fixed, uncommitted at time of writing — see `BUGS.md` for details.

- ✅ **BUG-006** — `PageTypePicker` (Add page → Choose Recipe) recipe list covered by iOS keyboard. Fixed with `Keyboard.addListener` + animated offset pattern (custom absolute-positioned sheets can't use `KeyboardAvoidingView`).
- ✅ **BUG-007** — Book Settings modal had no Save button and auto-saved per-tap. Reworked to draft state + explicit **Cancel / Save** buttons.
- ✅ **BUG-008** — Book default never flowed to recipes because `addBookPage` didn't link `recipes.cookbook_id`. Editor's hydration (`per-recipe override → cookbook default → fallback`) had nothing to resolve to. Fixed: `addBookPage` backfills `recipes.cookbook_id` on first-add; book builder `addMutation` invalidates `['recipe', id]` + `['recipes']`.
- ✅ **BUG-009** — SecureStore "User interaction is not allowed" crash when iOS is locked / app backgrounded. Fixed via `AppState` listener that starts/stops Supabase's auto-refresh (canonical pattern).

### Phase D — what's landed (uncommitted)

- Migration `supabase/migrations/20260422000001_cookbook_section_titles.sql` — adds NOT NULL `section_titles jsonb` with default `{"ingredients":"Ingredients","method":"Method"}`. **Needs to be applied via Supabase dashboard SQL editor before the UI works end-to-end.**
- `src/types/cookbook.ts` — new `CookbookSectionTitles` type + `DEFAULT_SECTION_TITLES` constant; `Cookbook` + `CookbookInsert` extended.
- `app/book/[cookbookId].tsx` — Settings modal gains two `TextInput`s (Ingredients / Method) with keyboard-lift via `Keyboard.addListener` + animated `translateY` (reuses the pattern from `PageTypePicker`). Save batches template + font + section_titles into a single `updateCookbook` call.
- `src/components/canvas/PageTemplates.tsx` — new `sectionTitles?: CookbookSectionTitles` prop on `TemplateProps`; 9 hardcoded strings replaced with `resolveSectionTitle()` + fallback. Journal keeps its `:` suffix at the render site.
- `app/editor/[recipeId].tsx` — passes `cookbook?.section_titles` into `<PageTemplate />`.
- `app/recipe/[id].tsx` — fetches cookbook when `recipe.cookbook_id` set; Clean view "Instructions" now renders cookbook `method` label (default "Method"); Share text also uses the cookbook labels.

**Behavior change:** Clean view previously read "Instructions" (hardcoded); it now renders `section_titles.method`, which defaults to "Method". Intentional — keeps Clean PDF matching the scrapbook pages.

### Phase E — what's landed (uncommitted)

- Migration `supabase/migrations/20260422000002_cookbook_paper_type.sql` — adds NOT NULL `paper_type text` with `'blank'` default and a `CHECK` constraint allowing only `blank | lined | dotted | grid`. **Applied via Supabase dashboard.**
- `src/types/cookbook.ts` — new `CookbookPaperType` type; `Cookbook` + `CookbookInsert` extended.
- `src/components/canvas/PaperPattern.tsx` *(new)* — `react-native-svg` component rendering the four patterns as absolute-positioned, `pointerEvents="none"` overlays. `blank` returns `null`. `lined` draws horizontal lines every 28px starting at y=56; `dotted` uses an SVG `<Pattern>` of 1.2r circles on a 16×16 grid; `grid` uses crossed lines on a 24×24 grid. All patterns use `colors.inkFaint` at 0.3–0.45 stroke opacity.
- `src/components/canvas/PaperPicker.tsx` *(new)* — horizontal strip of four tiles, each a 54×72 preview rendered by the `PaperPattern` component itself (single source of truth for geometry). Matches `TemplatePicker` / `FontPicker` visual language.
- `app/book/[cookbookId].tsx` — Settings modal gains a "Paper" row between Default handwriting font and Section titles. Save batches `paper_type` with the existing three fields in one `updateCookbook` call. "Paper type is coming next" footer removed.
- `app/editor/[recipeId].tsx` — `<PaperPattern>` rendered inside the canvas `<View>` before `<PageTemplate>`, reading `cookbook?.paper_type ?? 'blank'`.
- `app/recipe/[id].tsx` — Scrapbook view gains a `paperType` prop; pattern renders beneath washi + template + stickers. Clean view left alone (pattern is scrapbook/page chrome, not cooking chrome).

### Phase E polish (landed 2026-04-22)

- `PaperPattern.tsx` — geometry switched from hardcoded px (tuned for a 560px design width) to A4 physical-mm scaling (8mm lines, 5mm dots, 5mm grid), so pattern density matches real stationery on any canvas width. Dot radius 0.9 → 0.5. Top margin removed (`34mm → 0`) — pattern now runs edge-to-edge like real notebook paper.
- `BUGS.md` — logged `BUG-010` (paper pattern missing from exported PDF) as 🟡 Deferred to Phase F.
- `CLAUDE.md` — added "Running the app on the user's iPhone" section so future Claude instances know the port / tunnel / QR workflow without re-discovering.
- `.claude/plans/canvas-zoom.md` *(new)* — scoping plan for always-on pinch-to-zoom; deferred until after A + B because atomization rewrites the block tree that zoom has to wire `simultaneousWith` relationships against.

### Editor stability fixes (landed 2026-04-22)

Surfaced during Phase E device testing; unrelated to the paper feature but fixed in the same session.

- ✅ **BUG-011** — Drawing strokes silently dropped after app reload. Root cause: `drawingStore.partialize` excluded `activeLayerId`. Fix: persist `activeLayerId` + make `init` idempotent (restore it to the first layer's id when null).
- ✅ **BUG-012** — Text-heavy blocks jumped 40–80px down ~200ms after template change. Root cause: `onContentLayout`-measured height was committed to `blockOverrides[id].h` and fed back into `translateY = cy - h/2`. Fix: `useBlockResolver` now ignores `ov.h` for text-heavy blocks (always uses template default); `GestureBlock` still tracks real content height via its own `measuredH` shared value.
- ✅ **BUG-013** — Delete `×` unreachable on short blocks in Arrange mode. Root cause: side handle rendered after delete in the JSX tree and its hitSlop completely covered the 22×22 button. Fix: delete now rendered **last**, `zIndex: 3`, pushed out to `top/right: -14`.

### Phase A — what's landed

- `blockDefs.ts` — `classic` and `minimal` lose the `header` mega-block; gain separate `description` + `pills` blocks. `photo-hero` keeps `hero` (image + title + pills overlay) but loses its description line — description becomes a new block between hero and the ingredient/method columns. `recipe-card` keeps `banner` (title + accent background) but loses description — description becomes a new block between banner and the photo/ingredients row. `two-column` gains a new `description` block between the full-width title and the two columns. `journal` was already atomized here; no change.
- `PageTemplates.tsx` — each of the 5 changed templates stops rendering description text inside its former mega-block and adds a dedicated `<BlockElement>` for description. Classic and Minimal also add a dedicated `pills` `<BlockElement>` wrapping the TimePills row. Every description block is gated on `recipe.description` being non-empty.
- `canvasStore.ts` — zustand persist config bumped to `version: 2` with a `migrate` function that clears `blockOverrides` when hydrating from v1. Safe one-time reset because no production users yet.

### Phase B — what's landed

Every template is now built from the 9-atom set. Atoms per template:

| Template | Atoms |
|---|---|
| Classic | title / description / pills / image / ingredients-heading / ingredients-list / method-heading / method-list / tags |
| Photo Hero | image (with decorative dark overlay) / title / description / pills / ingredients-heading / ingredients-list / method-heading / method-list |
| Minimal | title / description / pills / ingredients-heading / ingredients-list / method-heading / method-list |
| Two Column | title / description / image / pills / ingredients-heading / ingredients-list / method-heading / method-list |
| Journal | title / description / photo / pills / ingredients-heading / ingredients-list / method-heading / method-list / tags |
| Recipe Card | title (with accent-banner background) / description / image / ingredients-heading / ingredients-list / method-heading / method-list / tags |

- `canvasStore` persist bumped to `version: 3`; migrate clears `blockOverrides` when hydrating from v1 or v2.
- `blockDefs.ts` rewrote all 6 template block arrays; removed mega-block IDs (`header`, `hero`, `banner`, `meta`, `left-col`, `right-col`, `ingredients`, `steps`, `method`).
- `PageTemplates.tsx` every template's render split into per-atom `<BlockElement>` wrappers. Photo Hero keeps its dark image overlay as a child of the `image` block so the overlay travels with the image when user drags. Recipe Card keeps the accent banner as a child of the `title` block.

### Phase F — foundation landed (2026-04-22)

- `src/lib/recipePage.ts` *(new)* — canonical `RecipePage` JSON schema that both renderers (RN editor + HTML/CSS print) consume. Positions stored as fractions of page dimensions so any physical size (A4, Letter, Lulu custom) scales cleanly.
- `serializeRecipePage(input)` snapshots the editor state (recipe + cookbook + canvas state + drawing state + palette + authoring canvas size) into a `RecipePage`. Applies `stepOverrides` / `ingOverrides` so the serialized content matches what the user sees. Normalizes sticker positions and stroke coordinates into fractions. Pass-through for `blockOverrides` (already fractions per canvasStore convention).
- Schema covers: style (template / font / palette / paper type / section titles), content (title + description + pills + visible ingredients + visible instructions + tags), block position overrides, stickers (`cx/cy/rotation/scale/zIndex`), drawing layers with per-stroke fractional width and normalized points.
- Resolver helpers: `resolveStickerPosition`, `resolveStrokeWidth`, `resolveStrokePoint` convert fractions back to pixels for any physical render size.
- `RECIPE_PAGE_VERSION = 1`. Bump on shape changes.

### Next up (in order)

1. **Phase F — HTML renderer.** Build an HTML/CSS template that consumes a `RecipePage` and produces an A4 page. Embed Google Fonts (Fraunces + Caveat + Nunito + Marck / Bad / Amatic for handwriting). SVG background for paper pattern. SVG paths for drawing strokes. SVG for built-in stickers.
2. **Phase F — export path.** Client-side: `serializeRecipePage` → render to HTML in a WebView → user taps iOS native share → "Save to Files" produces a PDF. Ships before we need server-side Puppeteer.
3. **Phase F — server renderer (later).** Puppeteer on Railway (not Deno Edge Function — Puppeteer's Chromium isn't Deno-compatible). Supabase Edge Function acts as a proxy. Needed for bulk book export + Lulu ordering.

---

## Context

The recipe canvas needs to be **consistent and field-granular** across all six templates, with **global book-level settings** driving the defaults. Specifically:

1. **Every filled recipe field becomes its own movable block** — title, description, prep/cook/servings pills, photo, ingredients, method, tags. Same gesture/resize/font-bump affordances as the existing method block. Section titles ("Ingredients", "Method") are also editable blocks.
2. **Template choice moves to the Cookbook level** — user picks one at book creation, it becomes the default for every new recipe page, still overridable per recipe.
3. **Section titles become cookbook-level** — user sets them once (e.g. "Ingredients" → "Що потрібно"), applies everywhere.
4. **Paper type** chosen at book creation: blank / lined / dotted / grid (checkered).
5. **Paper patterns must survive printing** — pattern and text must not drift apart in the exported PDF.

---

## Recommended execution order

Two independent tracks + print:

- **Track 2 first (C + D + E)** — book-level settings. Additive DB columns, no canvas risk. Ships the "Create Recipe Book" UX exactly as described.
- **Track 1 second (A + B)** — canvas atomization. Higher refactor risk but cleaner once section titles live on the cookbook.
- **Track 3 last (F)** — print contract. Biggest commitment; design the shared JSON schema early so Track 1 can produce it.

Each phase is shippable and testable on device before starting the next.

---

## What already exists (good news)

- `cookbooks` table with `palette`, `intent`, `recipient_name` (`supabase/migrations/20260418000001_schema.sql:40–56`).
- `book_pages` table with a `template_key` column **already present but unused**.
- Book Builder screen + CRUD is live (`app/book/[cookbookId].tsx`, `src/api/cookbooks.ts`, `src/api/bookPages.ts`).
- Recipe data model is rich (`src/types/recipe.ts`): title, description, ingredients[], instructions[], servings, prep_minutes, cook_minutes, tags, cover_image_url.
  - `instruction.tip`, `instruction.image_url`, `ingredient.group` all exist but are **never rendered** today.
- Canvas block system (`blockDefs.ts`, `BlockElement.tsx`, `PageTemplates.tsx`) supports per-block gestures, font-bump, width drag, remount-on-reset, override persistence, snapshot-based undo.
- `users.paper_texture` column exists but is not read by the renderer.
- `PaperGrain.tsx` exists but is a UI-only solid-color tint (not baked into canvas or PDF).

## What's missing / inconsistent today

- Each template groups 2–4 recipe fields into a single "mega-block" (Classic `header` = description + pills; Photo Hero `hero` = title + description + pills + image; Two Column has no description at all, Journal's `meta` bundles pills + ingredients under a hardcoded "What you'll need:" label).
- Description line caps differ per template (1 / 2 / 3 / not-shown).
- Section titles ("Ingredients", "Method", "What you'll need:", "Instructions") are hardcoded English strings scattered across `PageTemplates.tsx`. No i18n wiring.
- `templateKey` and `recipeFont` are stored per-recipe in `canvasStore.ts` only; `cookbooks` and `book_pages` don't influence them.

---

## Phase A — Normalize description across templates

**Goal:** every template has a movable `description` block, with consistent gating.

- Split `header` mega-block in Classic / Minimal into two: `description` + `pills`.
- Extract description from Photo Hero `hero` and Recipe Card `banner` into their own `description` block (title + photo stay in their mega-block for now).
- Add a `description` block to Two Column.
- Each `description` block is `isTextHeavy: true`, resizable width, fontScale — identical to existing text blocks.
- Gate visibility on `recipe.description != null && length > 0`.

**Files:** `src/lib/blockDefs.ts` (add `description` def to each of 6 template arrays), `src/components/canvas/PageTemplates.tsx` (rewire each template's render).

**Risk:** existing test recipes with `blockOverrides` for `header` lose their custom positioning. Mitigation: treat it as a one-time reset — no production users yet; safe to invalidate. Add a migration key `blockOverridesSchemaVersion: 2` and clear overrides when mismatch.

---

## Phase B — Atomize every recipe field into its own block

**Goal:** per-recipe-field block granularity everywhere.

Canonical **atomic block set** shared across templates (each template picks which atoms it uses + computes default layout):

| blockId | field | text-heavy |
|---|---|---|
| `title` | `recipe.title` | yes |
| `description` | `recipe.description` | yes |
| `pills` | prep / cook / servings | yes |
| `image` | `recipe.cover_image_url` | no |
| `ingredients-heading` | section title (string from cookbook) | yes |
| `ingredients-list` | `recipe.ingredients[]` | yes |
| `method-heading` | section title | yes |
| `method-list` | `recipe.instructions[]` | yes |
| `tags` | `recipe.tags[]` | yes |

**Renames:**
- `header` → removed
- `hero` → split into `image` + `title` + `description` (Photo Hero keeps dark-overlay backdrop as a decorative layer, not a block)
- `banner` → removed (Recipe Card splits into `title` + `description` with accent-banner background on `title`)
- `meta` → removed (Journal splits into `pills` + `ingredients-heading` + `ingredients-list`)
- `left-col` / `right-col` → removed (Two Column atomizes)

Each template keeps its own `getDefault(pw)` so the **starting arrangement still visually differs** — Photo Hero still has a big top image, Recipe Card still has the accent banner on the title, Journal still has the slight photo rotation. What changes: users can pull any field out of its starting slot.

Section-title blocks (`ingredients-heading`, `method-heading`) render the cookbook-level string (from Phase D); fall back to hardcoded "Ingredients" / "Method" until D ships.

**Files:** `src/lib/blockDefs.ts`, `src/components/canvas/PageTemplates.tsx`, `src/lib/canvasStore.ts` (schema-version gate).

**Risks:**
- Default-layout math gets uglier (10+ blocks per template). Factor per-template layout into a helper that stacks blocks vertically with row composition.
- With 10 blocks × 6 templates = 60 defaults, regression chance is real. Snapshot test each template at default and assert block count + rough positions.

---

## Phase C — Book-level template + font as defaults

**Goal:** user picks template once in the book; every new recipe page inherits it; per-recipe override still works.

- Add columns to `cookbooks`: `default_template_key text`, `default_recipe_font text` (nullable, default `'classic'` / `'caveat'`).
- Extend `Cookbook` type + `createCookbook`/`updateCookbook` APIs.
- Editor template precedence at mount:
  1. Per-recipe override in `book_pages.template_key` (if present)
  2. Cookbook default
  3. Fallback 'classic'
- `setTemplateKey` from Layout mode persists to **`book_pages.template_key` for this recipe** (per-recipe override), not just Zustand.
- `canvasStore.ts` keeps local state; add a hydration path at editor mount that pulls resolved template from TanStack Query (book_pages + cookbook).
- Keep the existing "Changing the template will reset your block arrangement" alert.
- `users.paper_texture` stays user-level as a global default; cookbook overrides when set.

**Files:** `supabase/migrations/` (new migration), `src/types/cookbook.ts`, `src/api/cookbooks.ts`, `src/api/bookPages.ts`, `app/editor/[recipeId].tsx` (hydrate from server), `src/components/canvas/TemplatePicker.tsx` (no UI change needed), `app/book/[cookbookId].tsx` (book-level template picker).

**Risk:** race between Zustand persist and server-authoritative template. Mitigation: server authoritative on mount; Zustand rehydrate runs only if server data hasn't loaded yet (loading flag).

---

## Phase D — Cookbook-level section titles

**Goal:** user types custom labels for "Ingredients" and "Method" at book creation; every recipe renders them.

- Add `section_titles jsonb` column to `cookbooks` with shape `{ ingredients: string; method: string }`, defaulting to `{ ingredients: 'Ingredients', method: 'Method' }`.
- Expose in Book Builder settings (new modal or inline form on the book screen).
- `PageTemplates.tsx` reads the cookbook's section_titles via props (passed down from `/editor/[recipeId].tsx`), replacing the hardcoded spots.
- Journal's "What you'll need:" just becomes `ingredients` heading — one fewer special case.
- Clean view (`app/recipe/[id].tsx`) also reads cookbook section titles so Clean PDF matches.

**Files:** migration, `src/types/cookbook.ts`, `src/api/cookbooks.ts`, `app/book/[cookbookId].tsx` (settings affordance), `src/components/canvas/PageTemplates.tsx`, `app/recipe/[id].tsx`, new UI control for section-title editing.

**Nice-to-have surfaced:** this naturally unblocks Ukrainian i18n — section titles become data, not code. PLAN.md promises English + Ukrainian; this makes it trivially per-cookbook.

---

## Phase E — Paper type at cookbook level (visual, no print yet)

**Goal:** user picks blank / lined / dotted / grid at book creation; every recipe page shows the chosen background.

- Add `paper_type text` column to `cookbooks` (check constraint: `'blank' | 'lined' | 'dotted' | 'grid'`, default `'blank'`).
- Implement paper patterns as a **Skia layer** rendered below everything else in the page canvas (before stickers, text, drawings).
  - `blank` = no pattern (solid `colors.paper`)
  - `lined` = horizontal lines every ~24 Skia units, pale-ink stroke
  - `dotted` = grid of 1px dots on even spacing
  - `grid` = full horizontal + vertical lines (the "checkered" case)
- Pattern draws onto the same Skia surface drawing strokes use, so they unify in `makeImageSnapshot`.
- Line/dot color: `colors.inkFaint` at low alpha (≈0.25).
- Reuse `users.paper_texture` (low/medium/high) as pattern intensity (0.15 / 0.25 / 0.4 alpha).

**Files:** migration, `src/components/canvas/PaperPattern.tsx` (new Skia component), canvas page wrapper that hosts Skia (likely `SkiaCanvas.tsx` or `app/editor/[recipeId].tsx`), replace or update `PaperGrain.tsx`.

**Risk:** text rendered as React Native `Text` is not on the Skia surface today. Addressed in Phase F.

---

## Phase F — Print alignment contract

**Goal:** pattern and text share the same rasterization so they can't drift when printed.

Current architecture (PLAN.md): scrapbook PDFs = `makeImageSnapshot()` on Skia canvas → PNG → embedded in HTML via Puppeteer → PDF. Text blocks today are React Native `<Text>` outside the Skia canvas. **`makeImageSnapshot` probably captures Skia layers only — not RN text.** Verify before touching paper.

Two shapes:

**Shape 1 — bake everything into Skia.** Render text blocks as Skia `<Text>`/`<Paragraph>` nodes on the same surface. Pattern + text + strokes all rasterize together. Alignment guaranteed. Cost: rewriting `PageTemplates.tsx` to use Skia text primitives.

**Shape 2 (recommended) — server-side composite.** Keep RN `Text` for editor; on export render to HTML/CSS server-side: paper pattern as SVG background, text as real HTML text, Puppeteer prints the composite. Pattern is vector (sharp at 300dpi), text is vector (sharp at 300dpi), no mismatch. Cost: maintain two renderers (RN for edit, HTML for print) with a shared JSON page description.

The key commitment is a **`RecipePage` JSON schema** both renderers consume — block positions (as fractions of page, already what `blockOverrides` store), block content, template key, section titles, paper type. Editor mutates the JSON; export sends JSON to an Edge Function that runs a headless HTML template through Puppeteer.

Settles DPI + bleed: HTML-to-PDF via Puppeteer at correct physical size with CSS `@page { size: A4; margin: 0 }` + `.bleed { margin: 3mm }` → Lulu-ready output at requested DPI.

**Files:** `supabase/functions/export-recipe-pdf/` (new Edge Function), `src/lib/recipePage.ts` (new — shared JSON schema type + serializer), eventual refactor of `PageTemplates.tsx` to read from the schema. Gate behind a feature flag.

**Risk:** font rendering differs RN ↔ Chromium. Mitigation: same web fonts on both sides (Fraunces, Caveat, Nunito, 4 script fonts — all Google Fonts, all support Cyrillic). Embed via `@font-face`.

---

## Things noticed beyond the original ask

1. **Unused recipe data** — `instruction.tip`, `instruction.image_url`, `ingredient.group` exist in DB but aren't rendered. Phase B moment to decide: `tip` as optional line inside each step, `image_url` as small per-step thumbnail, `group` as ingredients subheading ("For the sauce:").
2. **`recipe.notes` is missing.** Millennial cookbook UX usually has "Mom's tip:" in the margin. Consider adding `recipe.notes text` and a `notes` block during Phase B.
3. **Servings label "Serves" + "Prep"/"Cook" pill labels** should travel with the section-title localization system (Phase D expansion).
4. **Book defaults apply to new recipes, not retroactively.** Per-recipe `template_key` on `book_pages` already handles this: "default template" applies only when `book_pages.template_key IS NULL`.
5. **Template change alert scope.** Today fires on per-recipe changes. Book-level default change should warn separately ("This will reset any recipes using the book default").
6. **Paper pattern + Apple Pencil dedication UX.** If user picks "lined" paper and writes with Pencil, they'll expect strokes to follow lines. `perfect-freehand` doesn't snap. Consider a subtle baseline guide matching default font baseline.
7. **Chapter-divider and cover pages are stubbed.** They'll eventually need the same block system. Design Phase B's atom list to generalize to non-recipe page types.
8. **Paper pattern intensity.** Reuse `users.paper_texture` (already `low/medium/high`) for opacity — no new radio buttons.
9. **`blockOverrides` invalidation.** Phases A+B make stored overrides meaningless. Add a `schemaVersion: 2` gate in persist config — on read, if version stale, clear all overrides. One-time reset, safe because no prod users.
10. **Clean PDF parity.** The "Clean view" (`app/recipe/[id].tsx:105-202`) has its own hardcoded strings ("Prep", "Cook", "Serves", "Total", "Ingredients", "Instructions"). Phase D touches this file too.

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| `blockOverrides` break on existing recipes | Medium (dev data only today) | `schemaVersion: 2` gate → clear + `layoutResetVersion++` |
| 10 blocks × 6 templates × getDefault math: regressions | High | Snapshot tests per template |
| Server vs Zustand template race on editor mount | Medium | Server authoritative on hydration; loading flag |
| Pattern–text misalignment on print | **Critical** | Phase F: shared JSON schema + HTML/CSS print renderer |
| Fonts differ RN ↔ Chromium | Medium | Same Google Fonts both sides; embed in HTML template |
| 96 DPI PNGs reach Lulu and get rejected | High (future) | Phase F HTML+Puppeteer renders at requested DPI natively |
| Moving book template default nukes recipes | Medium | Per-recipe override protects edited recipes; alert on global change |
| Performance with 10+ blocks per page × N recipes | Low-medium | Existing `layoutResetVersion` remount scales; fall back to keyed child memoization |
| Photo Hero + Recipe Card lose distinct character when atomized | Medium | Keep backdrop/accent as decorative non-block layer; title + description render *over* it |

---

## Critical files to modify

| Phase | File | Change |
|---|---|---|
| A | `src/lib/blockDefs.ts` | Add `description` block to each of 6 template arrays |
| A | `src/components/canvas/PageTemplates.tsx` | Split description out in 6 templates |
| A | `src/lib/canvasStore.ts` | `schemaVersion: 2` gate |
| B | `src/lib/blockDefs.ts` | Atomic block set per template |
| B | `src/components/canvas/PageTemplates.tsx` | One `<BlockElement>` per recipe field |
| B | `src/lib/recipePage.ts` *(new)* | Shared JSON page description type |
| C | `supabase/migrations/*_cookbook_template_defaults.sql` *(new)* | `default_template_key`, `default_recipe_font` on cookbooks |
| C | `src/types/cookbook.ts`, `src/api/cookbooks.ts`, `src/api/bookPages.ts` | Extend types + CRUD |
| C | `app/editor/[recipeId].tsx` | Server-authoritative hydration for template |
| C | `app/book/[cookbookId].tsx` | Book-level template picker |
| D | `supabase/migrations/*_cookbook_section_titles.sql` *(new)* | `section_titles jsonb` on cookbooks |
| D | `src/components/canvas/PageTemplates.tsx` | Read from cookbook section titles |
| D | `app/recipe/[id].tsx` | Clean view also reads cookbook section titles |
| E | `supabase/migrations/*_cookbook_paper_type.sql` *(new)* | `paper_type text` on cookbooks |
| E | `src/components/canvas/PaperPattern.tsx` *(new)* | Skia component: blank / lined / dotted / grid |
| F | `supabase/functions/export-recipe-pdf/` *(new)* | Puppeteer + HTML template, reads `recipePage.ts` |
| F | `src/lib/recipePage.ts` | Serializer/deserializer hardened for print |

---

## Verification plan

- **Phase A:** every recipe with non-empty description renders a draggable description block in all 6 templates. Visual diff. Undo works. Template-change alert still appears.
- **Phase B:** every populated recipe field has its own selectable block per template. Tap selects, edge-drag resizes, font-bump works, delete hides. Distinct "first look" preserved per template.
- **Phase C:** new recipe inside a cookbook with `default_template_key = 'journal'` opens in Journal. Changing book default doesn't mutate already-edited recipe. Override via per-recipe picker persists server-side.
- **Phase D:** change section titles in book to Ukrainian → all templates + Clean view show them. Empty string falls back to defaults.
- **Phase E:** pick "lined" paper on book creation → all recipe pages show lined background on screen. Native iPhone + web both render. Texture intensity affects opacity.
- **Phase F:** export test recipe to PDF. Open in Preview. Text is selectable (vector). Paper lines crisp at any zoom. Text–line alignment doesn't drift across pages. Run Lulu PDF validator or confirm A4 + embedded fonts. Submit test order for one recipe.
