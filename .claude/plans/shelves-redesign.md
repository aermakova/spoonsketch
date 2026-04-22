# Plan — Shelves screen redesign (books on wooden shelves)

**Owner:** Angy
**Target screen:** `app/(tabs)/shelves.tsx`
**Mockup:** `/Users/angy/Downloads/photo_2026-04-22 16.54.45.jpeg`
**Status:** ⏳ Not started

## Goal

Transform the Shelves tab from a list of rectangular cookbook cards into a tactile "bookshelf" view: cookbooks rendered as book covers sitting on wooden shelves, two books per shelf, with a decorative botanical sprig on each cover and a recipe-count badge.

The bottom tab bar is also redesigned to match the mockup's style (rounded colored icons, labels).

## What's in / out of scope

| ✅ In | ⏸ Deferred |
|---|---|
| Shelf + book-cover layout, 2 books per row | Search bar above the shelves |
| "Add Cookbook" tile as the last slot (dashed, `+` icon) | Filter chips (All / Favorites / Mains / Desserts / Family) |
| Per-cookbook cover colour + sprig | Hamburger menu opening a drawer / settings |
| Recipe count on each cover | Bell icon / notification centre |
| Bottom tab bar visual refresh | Renaming tabs to match mockup (Recipes / Books / Shop) — separate decision |

Search + filter chips + header chrome are real mockup elements but aren't load-bearing for the book metaphor. Ship them in a follow-up after the shelves land.

## Current state (2026-04-22)

- `app/(tabs)/shelves.tsx` renders a vertical list of cookbook cards with swipe-to-delete. Each card is a coloured rectangle + title + recipe count.
- `src/api/cookbooks.ts` provides CRUD; `cookbooks` table has `palette` (one of 4), `title`, `description`, `cover_url` (unused so far).
- Tab bar (`app/(tabs)/_layout.tsx`): Home · Shelves · + · Elements · Me. Emoji icons. Labels are plain `Text`.

## Desired state

### Shelves grid

- Paper-coloured background (existing palette `colors.paper`).
- Rows of 2 book covers, each row sitting on a wooden shelf plank.
- The shelf plank is a horizontal PNG strip the full content width, with a soft shadow beneath.
- Rows scroll vertically; bottom inset accounts for the tab bar.
- One "Add Cookbook" tile is always present as the last slot (after the user's last book). When `N` cookbooks exist: layout renders `⌈(N+1)/2⌉` shelves; the `N+1`th slot is the add tile.

### Book cover

Dimensions: tall rectangle at ~3:4 aspect. On a 390pt phone with 24pt page padding and 12pt between books, each cover is `(pageW − 24*2 − 12) / 2` ≈ 165pt wide, ~220pt tall.

Cover anatomy (top → bottom):
1. Solid cover colour (per cookbook).
2. Title in handwritten-serif (Fraunces italic) — 2 lines max, centred, near the top. Light colour on dark covers, dark on light.
3. Botanical sprig SVG — centred vertically below the title, scaled to fit.
4. Small cream/white badge in the bottom-right corner: recipe count integer only (e.g. `52`). Matches the mockup — no "recipes" label.
5. Subtle inner border or spine shading to read as a book (1px inset stroke; maybe a hint of shadow on the left edge to look like a spine).

Cover colours: pick per-cookbook at creation (see "Data model" below).

### "New Cookbook" tile

Same dimensions. Dashed border around a `+` icon and "New Cookbook" label. Background matches the paper. Taps open the existing `CookbookFormModal` (already built).

### Wooden shelf

User is providing a wood PNG. Placed as an `<Image>` below each row, stretched to content width. Height ~14pt. A faint dark shadow underneath (`boxShadow` / `elevation`). Very subtle 3D feel.

### Bottom tab bar

Visual refresh only in this plan (keep the 4 tabs + FAB the user already has). Matches the mockup style:
- Rounded soft icons rather than emojis (candidate: lucide-react-native — already works via react-native-svg, can add if needed; otherwise swap the emojis for better-weighted ones).
- Label font weight matches the active-state terracotta tint.
- Active tab has the terracotta colour; inactive is inkFaint.
- Centre FAB stays the same (terracotta circle with `+`).

*(If you actually want to restructure the tabs to `Home · Recipes · + · Books · Shop` matching the mockup's IA, that's a separate discussion — say the word and I'll add a Phase for it. For now I'm treating the mockup's tab bar as visual-reference-only.)*

## Assets required from you

| Asset | Purpose | Format | Where to drop |
|---|---|---|---|
| 4–6 sprig SVGs | Cover decoration, rotated per cookbook | SVG | `assets/sprigs/sprig-1.svg` … `sprig-6.svg` |
| Wood shelf PNG | Horizontal shelf plank under each row | PNG, ~1500×60 px @3x (transparent ends optional) | `assets/shelves/wood-shelf.png` |

SVG rendering: we'll load via `react-native-svg`'s `SvgXml` (raw SVG text). If you prefer component-style, we can add `react-native-svg-transformer` — small Metro config change.

## Data model

Cover colour: extend the `cookbooks` table with a `cover_color text` column (hex), defaulting to a value derived from `palette`. Reason: mockup shows covers in colours that aren't tied to the current 4 palettes (dark teal, warm sand, etc.) — `palette` drives the app-wide accent and isn't the right signal.

Sprig selection: extend with `cover_sprig text` column storing the sprig id (`sprig-1` … `sprig-6`). Randomly assigned on cookbook creation if not chosen by the user; editable later via the Cookbook Settings modal.

Migration:
```sql
alter table cookbooks
  add column cover_color text not null default '#ada2a0',
  add column cover_sprig text not null default 'sprig-1';
```

Both columns are display-only — no RLS changes needed beyond existing row-level user_id scoping.

## Component breakdown

New files:

| File | Responsibility |
|---|---|
| `src/components/shelves/BookCover.tsx` | Renders a single cookbook as a book cover (colour + title + sprig + count badge). Tap = navigate to book builder. Long-press = open edit modal (or keep swipe-to-delete as today — TBD). |
| `src/components/shelves/EmptySlot.tsx` | The dashed `+ New Cookbook` tile. Tap = open `CookbookFormModal`. |
| `src/components/shelves/WoodShelf.tsx` | The horizontal wood plank Image with shadow. |
| `src/components/shelves/Sprig.tsx` | Given a sprig id, renders the matching SVG via `SvgXml`. Centralises the id → SVG asset map. |
| `assets/sprigs/*.svg` | User-provided sprig SVGs. |
| `assets/shelves/wood-shelf.png` | User-provided wood texture. |
| `supabase/migrations/*_cookbook_cover.sql` | Add `cover_color` + `cover_sprig`. |

Modified:

| File | Change |
|---|---|
| `app/(tabs)/shelves.tsx` | Replace the current list with a grid of `BookCover` + `EmptySlot` rows interleaved with `WoodShelf` dividers. Keep CookbookFormModal. |
| `app/(tabs)/_layout.tsx` | Visual refresh of tab bar: better icons, active/inactive colour tokens matching mockup, same 4 tabs + FAB. |
| `src/api/cookbooks.ts` | Extend `createCookbook` / `updateCookbook` to accept `cover_color` and `cover_sprig`. |
| `src/types/cookbook.ts` | Add `cover_color` / `cover_sprig` to `Cookbook` type + `CookbookInsert`. |
| `app/book/[cookbookId].tsx` | Extend Book Settings modal with a cover-colour + sprig picker (nice-to-have; could defer). |

## Phase plan

### Phase 1 — Visuals, no data model change
Scope: build `BookCover` / `EmptySlot` / `WoodShelf` / `Sprig` with hardcoded colours and sprigs derived from the existing `palette` column and cookbook id (hash → sprig). Ship the grid layout. No migration yet.

Why first: zero risk of breaking existing cookbook data. We can iterate on visuals without worrying about DB schema. Deliverable: shelves look right with existing data.

Outcome:
- User sees the redesigned screen.
- Each cookbook maps deterministically to a cover colour (from `palette`) and a sprig (from `id` hash).
- Add Cookbook tile works.
- Existing tabs still function; tab bar refreshed visually.

### Phase 2 — Data model for per-cookbook customisation
Scope: add `cover_color` + `cover_sprig` columns, wire `CookbookFormModal` to let the user pick them at create time, surface them in Book Settings for editing later.

Why second: the visual is de-risked in Phase 1 and we can focus on UX for picking a colour + sprig without simultaneously debugging layout.

Outcome:
- Creating a cookbook offers a cover-colour swatch row + sprig preview picker.
- Editing a cookbook exposes the same fields.
- Covers reflect whatever the user chose.

### Phase 3 *(optional / later)* — Header chrome + search + filter chips
Scope: hamburger menu (drawer or modal), bell icon (stub), search bar scoped to this tab, filter chips (All / Favorites / Mains / Desserts / Family — the last four need a tag system we don't have yet).

Why last: not needed for the book metaphor; filters need a `tags` concept on cookbooks that isn't designed yet. Park until after Phase 1 + 2 ship.

## Visual specs

| Token | Value |
|---|---|
| Page padding | 24pt horizontal |
| Gap between books in a row | 12pt |
| Row vertical gap (shelf thickness + shadow) | 28pt |
| Book cover radius | 4pt |
| Book cover shadow (inner left, spine) | `insetShadow` or a 2pt-wide dark gradient on the left 4pt |
| Book count badge | 18pt tall pill, `#faf4e6` bg, `colors.ink` text, 2pt corner radius, 6pt padding |
| Title position | ~14pt from top, center-aligned, 2 lines max |
| Sprig frame | ~60% of cover width, centered vertically in the lower half |

Candidate cover colour palette (for random assignment in Phase 1):
- `#3c5a5e` (dark teal)
- `#b4613e` (terracotta)
- `#e6d9b8` (cream with dotted accent)
- `#5a6e4a` (sage)
- `#efe2c4` (warm sand)
- `#8a5f7a` (plum — from existing `colors.plum`)

## Risks

| Risk | Mitigation |
|---|---|
| SVG sprigs ship with different aspect ratios and break cover composition | Add `preserveAspectRatio="xMidYMid meet"` + a fixed container box; crop on overflow. Ask for sprigs sized ~400×400 viewBox. |
| Wood PNG tile boundary is visible when shelves stretch | Either the user's PNG is seamless-tileable, or we size the shelf `Image` to `resizeMode="stretch"` (accepts some distortion — usually unnoticeable at shelf scale). |
| Cover text contrast on randomly-assigned colours | Per-colour pair known at build time (hex → light/dark text). Store in a constant. |
| Existing users have dev cookbooks that look wrong after migration | Covers derive from `palette` + id hash in Phase 1 — no data change. In Phase 2, migration sets defaults from `palette`; covers still look reasonable, user can edit. |
| 5 tabs in the mockup vs. 4 in the app | Deferred — explicit non-change for this plan. |
| Two cookbooks with the same `palette` get identical covers in Phase 1 | Hash `cookbook.id` into both the colour (from the 6-colour candidate palette) and the sprig (from 6 sprigs); collision after 36 cookbooks but acceptable for v1. |

## Acceptance

Phase 1 ships when:
- [ ] User with 0 cookbooks sees 1 row = 1 "New Cookbook" tile + empty right slot.
- [ ] User with 1 cookbook sees 1 row = book on left + "New Cookbook" tile on right.
- [ ] User with 2 cookbooks sees 1 row, both slots filled.
- [ ] User with 3 cookbooks sees 2 rows: 2 books on top row, 1 book + "New" tile on second row.
- [ ] Every row has a wood shelf below it.
- [ ] Tapping a book opens the Book Builder as today.
- [ ] Tapping the `+` tile opens the existing create modal.
- [ ] Tab bar labels don't wrap, active tab shows terracotta, inactive shows inkFaint (regression check from BUG-013's cousin).

Phase 2 ships when:
- [ ] Creating a cookbook shows a 6-swatch colour row + sprig preview; user can pick either or accept the defaults.
- [ ] Editing a cookbook in Book Settings shows the same pickers populated with current values.
- [ ] Covers reflect the stored `cover_color` + `cover_sprig`.

## Open questions

1. **Long-press vs. swipe for delete.** Current shelves use swipe-to-delete. With book covers on shelves, swiping feels wrong. Proposal: long-press → action sheet (Rename / Change cover / Delete). Confirm or keep swipe somehow.
2. **Recipe count source.** Today Shelves doesn't show per-cookbook recipe count — it's derived. Need a `count(book_pages where page_type='recipe')` somewhere. Either (a) add a `recipe_count` computed column, (b) fetch `book_pages` per cookbook on Shelves render (N+1 query), or (c) use a single Supabase view/RPC. Recommend (c).
3. **Sprig count.** 4 or 6 sprigs? More = more variety, less = less design work for you. Plan assumes 6.
4. **Cover text colour.** Auto-pick light/dark based on colour luminance, or always dark with a translucent paper overlay behind the text? Mockup looks like per-colour baked-in text colour.

## Next steps once you approve the plan

1. You drop SVGs into `assets/sprigs/` and the wood PNG into `assets/shelves/`.
2. I build Phase 1, one commit.
3. You test on device; feedback pass.
4. I build Phase 2, one commit.
5. Phase 3 (header chrome) — only if you decide you want it.
