# Plan — Stickers tab redesign (per new Figma comp)

> Note: previous plans (Marketing brief, Phase 8.5A, doc-sync, telemetry, etc.) all shipped. Overwriting per Plan-mode rules.

## Context

User uploaded two design variants (Desktop/8fed3418 + 619b7426) for the **Stickers tab** (formerly Stash, Elements). Both share the same structure with different grid densities (4-col vs 2-col packs).

The design is significantly more ambitious than what ships today. Visual diff and feature diff:

| Design wants | Today ships | Gap |
|---|---|---|
| Tab labelled **"Stickers"** with heart icon | "Stash" with grid icon | rename |
| Tab bar: Home / **Cookbooks** / + / **Stickers** / **Profile** | Home / Shelves / + / Stash / Me | 3 tab renames |
| Header with sage-leaf flourishes + pink heart accent + Fraunces title | Plain "Your stash" header | visual upgrade |
| Subtitle: *"Tiny touches that tell your story."* | "Stickers, photos, and the things you come back to." | copy update |
| **Search icon** top-right | none | new feature |
| **My favorites** horizontal scroll (populated, not placeholder) | placeholder card "Heart a sticker to save it here" | end-to-end favorites system |
| **12 sticker packs** in 2×6 grid (Vegetables, Fruits, Spice Leaves, Herb Leaves, Dishes, Themed Sets, Scrapbook, Shapes & Doodles, Torn Papers, Washi Tape, Labels & Tags, **Numbers & Letters**) | 4 packs in `PACK_METADATA` (core + 3 premium placeholders) | registry rewrite |
| **Per-pack counts of 28–60** (e.g. Vegetables 48, Dishes 60, Scrapbook 52) | 6–20 per pack (we have 17 generated packs but counts are smaller) | accept gap or generate more |
| **From your library** section — 3 cards: Uploaded Photos / Transform to Sticker / Your Stickers | placeholder card "Coming with the next update" | major feature work |
| **Create your own stickers** CTA + creation flow | nothing | major feature work |
| Pack card design: bigger 3-thumb cluster, name + count, → arrow | smaller 2×2 thumbs, lock badge, footer | cosmetic refactor |

Critical context: user is **leaving on vacation in days**, has already generated 141 sticker PNGs (food + decor) but **the new packs are not yet wired into the registry** — they don't render in the app today regardless of this redesign. Plan must close the registry gap before pursuing visual polish.

## Decision: ship in three phases, only Phases 1 + 2 before vacation

| Phase | Effort | Goal | Recommended? |
|---|---|---|---|
| **Phase 1 — Wire reality + tab renames** | ~1 day | The 17 generated packs actually appear in the app; tab labels match design | **Yes — pre-vacation must-ship** |
| **Phase 2 — Visual + favorites + search** | ~3 days | Stash page matches design top-to-bottom for what we have; favorites + search work end-to-end; library section + Create CTA as honest placeholders | **Yes — vacation-doable** |
| **Phase 3 — Real library/upload/cutout/numbers&letters** | ~2 weeks | Photo-to-sticker upload, Transform-to-Sticker cutout, Your-Stickers grid, Numbers & Letters pack generation, sticker-count parity with design | **No — post-vacation v1.1** |

Out-of-scope for this entire plan: marketing-brief features beyond what's in this design (handwritten dedication editor, watercolor-recipe-photo, etc).

---

## Phase 1 — Wire the 17 generated packs + tab renames (~1 day)

### Why first
The 141 PNGs you generated yesterday do nothing in the app today because `STICKER_PACKS` only references `core` and `PACK_METADATA` only lists 4 packs. Until this lands, both the existing UI and the redesigned UI will be empty. This is the highest-ROI 4-hour change in the queue.

### Files to touch

| File | Change |
|---|---|
| `src/lib/stickerRegistry.ts` | Add 17 new const arrays (`BAKING_STICKERS`, `HERBS_STICKERS`, `VEGETABLES_STICKERS`, `FRUITS_STICKERS`, `SPICES_STICKERS`, `PANTRY_STICKERS`, `MEALS_STICKERS`, `DESSERTS_STICKERS`, `BOTANICAL_STICKERS`, `HOLIDAY_STICKERS`, `WASHI_STICKERS`, `PAPER_STICKERS`, `PHOTO_STICKERS`, `STICKERS_STICKERS`, `ADHESIVE_STICKERS`, `LABELS_STICKERS`, `DOODLES_STICKERS`) — each with `require('../../assets/stickers/<pack>/<id>.png')` lines mirroring `CORE_STICKERS`. Push them all into `STICKER_PACKS`. |
| `src/lib/stickerRegistry.ts` | Update `PACK_METADATA` to include all 18 packs (core + 17). Each entry: `id`, `name` (matching the Figma names: "Spice Leaves" not "Spices", "Herb Leaves" not "Herbs", "Various Dishes" not "Meals", etc.), `isPremium` (core = free, all others premium), `stickerCount` (real count), `previewIds` (3–4 representative IDs that render as the pack-card hero), `description` (one-line marketing-brief flavor). |
| `supabase/functions/auto-sticker/index.ts` | Replace `FREE_STICKER_KEYS` + `PREMIUM_STICKER_KEYS` with the actual generated IDs. Update `FREE_GUIDANCE` + `PREMIUM_GUIDANCE` prompt blocks to reflect the new pack groupings. |
| `app/(tabs)/_layout.tsx` | Rename tabs: `shelves.tsx` → label "Cookbooks" (Feather `book` icon, was `book-open`); `stash.tsx` → label "Stickers" (Feather `heart` icon, was `grid`); `me.tsx` → label "Profile" (Feather `user`, unchanged). Tab file names can stay (route URLs are internal — no public deep-link risk) OR rename — recommend **keep file names**, change only `t('tabs.*')` keys + icon names. |
| `src/i18n/en.json` + `uk.json` | Update `tabs.shelves` value to "Cookbooks" (EN) / "Кулінарні книги" (UK); `tabs.stash` → "Stickers" / "Стікери"; `tabs.me` → "Profile" / "Профіль". |

### Pack name mapping (Figma → registry IDs)

The Figma uses prettier names than our `PackId` enum. Set `name` field to Figma label; `id` stays as code-friendly enum.

| Figma name | Our pack id | Sticker count we have |
|---|---|---|
| Vegetables | `vegetables` | 15 |
| Fruits | `fruits` | 11 |
| Spice Leaves | `spices` | 9 |
| Herb Leaves | `herbs` | 11 |
| Various Dishes | `meals` (+ `desserts`?) | 12 / 18 if combined |
| Themed Sets | `holiday` | 7 |
| Scrapbook | `paper` | 6 |
| Shapes & Doodles | `doodles` (+ `botanical`?) | 6 / 11 if combined |
| Torn Papers | `paper` *(overlaps with Scrapbook)* | 6 |
| Washi Tape | `washi` | 6 |
| Labels & Tags | `labels` (+ `adhesive` + `stickers`?) | 4 / 12 if combined |
| Numbers & Letters | ⚠️ **doesn't exist** | 0 |
| (no Figma equivalent) | `pantry`, `baking` | 9, 20 |

Recommendation:
- Show all 18 packs (core + 17 generated). Don't try to merge; users see more variety.
- Pre-name the missing "Numbers & Letters" as **a placeholder card with `stickerCount: 0`** and `previewIds: []` — the empty grid pattern already handles it (see `PackCard.tsx` opacity-locked logic). Footer says "Coming soon".
- Counts shown will not match Figma's 28–60 numbers — that's accepted gap. Phase 3 generates more if needed.

### Verification

- `npx tsc --noEmit` clean.
- Open editor → Stickers mode → tab list shows 18 pack tabs. Free pack (Essentials) has thumbs; premium packs (with no userTier) show locks. Premium user (set via Supabase Studio) → all 18 packs unlocked.
- Stash page → 18 pack cards render in 2-col grid. Numbers & Letters card shows "Coming soon" instead of broken thumbs.
- Auto-sticker on a baking-themed recipe (premium user) → may suggest from any of the 17 packs.

### Commit shape

Single commit: `Phase 1 — wire 17 generated sticker packs + tab renames (Cookbooks / Stickers / Profile)`.

---

## Phase 2 — Stickers page redesign (~3 days)

Builds the visual + functional shell of the new Stickers tab. Some sections are real (favorites, search, pack grid); others are honest placeholders (library, Create new) so the page LOOKS finished even though Phase 3 fills in the rest.

### 2A. Header redesign (~2h)

`src/components/stash/StashScreen.tsx`:
- Replace plain "Your stash" header with:
  - Top bar: back arrow (left, `chevron-left`) + Fraunces "Stickers" centered (with sage `❦` leaves on either side + tiny pink heart) + search icon (right, `search`)
  - Subtitle: Caveat-style "*Tiny touches that tell your story.*" with a small heart at end
  - Torn-paper edge separator (paper grain texture) below header
- Search icon tap → opens **`StickerSearchModal`** (built in 2D)

### 2B. My favorites section (~1 day)

End-to-end favorites for stickers. New DB table + API + hook + UI.

**Server (new migration):** `supabase/migrations/20260428000001_sticker_favorites.sql`
```sql
create table public.sticker_favorites (
  user_id     uuid not null references public.users(id) on delete cascade,
  sticker_key text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, sticker_key)
);
create index on public.sticker_favorites(user_id, created_at desc);
alter table public.sticker_favorites enable row level security;
create policy "users own their favorites" on public.sticker_favorites
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

**Client API:** `src/api/favorites.ts` (new)
- `fetchFavorites(): Promise<string[]>` — returns sticker_key array, ordered by created_at desc
- `addFavorite(stickerKey: string)` / `removeFavorite(stickerKey: string)`

**Hook:** `src/hooks/useFavoriteStickers.ts` (new)
- TanStack Query for fetch + optimistic mutate via `useMutation`
- Exposes `{ favorites, isFavorite(key), toggle(key) }`

**UI integrations:**
- `StashScreen.tsx`: above the pack grid, render "My favorites" section with horizontal `ScrollView` of `<Sticker>` thumbs (size 56, no labels). "See all" link if >7 → opens `/stash/favorites` route (new).
- `PackDetailScreen.tsx` sticker preview sheet: add a heart toggle button next to "Use in a recipe →" CTA.
- `src/components/canvas/StickerTray.tsx` (in editor): add a long-press → heart-toggle to favorite a sticker without leaving the editor.
- New route `app/stash/favorites.tsx` for "See all" full-screen grid (reuses `PackDetailScreen` layout pattern).

**Edge case:** when no favorites yet, show a single placeholder line "Heart a sticker to save it here." — matches design's first-launch state.

### 2C. Pack card redesign (~3h)

`src/components/stash/PackCard.tsx`:
- New layout: large hero thumb cluster (3 stickers overlapping at slight rotations, top half of card) + pack name (Fraunces 16px, ink) + sticker count (Caveat 13px, inkSoft) + tiny `→` arrow in lower-right
- Lock badge moves from top-right to a small overlay on the hero thumbs (subtle, not in the user's face)
- Preview shows the **first 3 of `previewIds`** rendered with -8°/+4°/-2° rotations and ~10px overlap (same painterly polaroid vibe as MARKETING_BRIEF visuals)
- Card height ~160px (up from current ~150px)

`StashScreen.tsx`: 2-col grid stays, gap 14px (matches design).

### 2D. Search modal (~4h)

New file: `src/components/stash/StickerSearchModal.tsx`
- Bottom-sheet modal (matches existing modal patterns from `PackDetailScreen`)
- Top: search input with placeholder "Search for stickers, herbs, holidays…"
- Body: grid of stickers matching the query, ranked by:
  - Exact `id` match first (e.g. "tomato" → tomato sticker)
  - `id.includes(query)` next
  - Pack name match (e.g. "herbs" → all herbs pack stickers)
  - Capped at 50 results to keep it snappy
- Empty state: "No stickers match" + Caveat hint "Try 'tomato' or 'autumn'"
- Tap a result → same flow as `PackDetailScreen` (sticker preview sheet → use in recipe)

Keyword expansion: search across `stickerRegistry.PACK_METADATA[*].id`, `name`, `description`, plus all `STICKER_PACKS[*].stickers[*].label` and `id`. No new tags table — string-match on existing fields is sufficient for v1.

### 2E. From-your-library section (~2h)

3 placeholder cards in the same row layout as design:

| Card | Status | Behavior |
|---|---|---|
| **Uploaded Photos** | Coming-soon placeholder | Tap → modal "Coming with v1.1 — drop photos into your stash and use them as stickers" |
| **Transform to Sticker** | Coming-soon placeholder | Tap → modal "Coming with v1.1 — upload any photo, we cut it out for you" |
| **Your Stickers** | Coming-soon placeholder | Tap → modal "Coming with v1.1 — see all your custom stickers in one place" |

Card visual matches design (small hero image left, title + body right, `→` lower-right).

These are honest placeholders — clear about timing — so the screen LOOKS finished without overpromising.

### 2F. Create-your-own-stickers CTA (~1h)

Bottom of Stickers page, single full-width card:
- Icon: small open-book illustration (could be a static image; reuse a sticker thumb)
- Title: "Create your own stickers"
- Subtitle: "Turn memories into meaningful details."
- Primary "Create new" button (terracotta, right-aligned)

Tap → modal "Coming with v1.1 — generate a custom sticker from your photo." Same pattern as 2E placeholders.

### 2G. Living-doc updates (~30 min)

- `FEATURES.md` §6 (Stash → Stickers tab): rewrite for new layout.
- `SCREENS.md` §15 (Me tab) → §15 (Profile tab) rename. Add new §08 "Stickers tab" stub spec.
- `MANUAL_TESTS.md`: 6 new scenarios (favorites toggle, search modal hits, library placeholders, etc.).
- `PLAN.md`: tag Phase 8.5 row Phase 1 ✅; add new Phase 8.5C row "Stickers tab redesign — Phase 1 + 2".
- `CLAUDE.md`: tab name corrections (Stickers / Cookbooks / Profile).
- `i18n/{en,uk}.json`: add new tab labels + section headings.

### Phase 2 verification

- Free user opens Stickers tab → sees header, no favorites yet (placeholder), 18 pack cards, library placeholders, Create new CTA. Everything renders, nothing is broken.
- Heart a sticker in editor → returns to Stickers tab → sticker appears in My favorites scroll.
- Tap search → search "tomato" → tomato sticker shows; tap → preview sheet → "Use in recipe" → editor.
- Tap any library placeholder → "Coming with v1.1" modal explains.
- Premium user (Supabase Studio set tier='premium') → all 18 pack cards unlocked, full pack-detail browse.
- `npx tsc --noEmit` clean.

### Phase 2 commit shape

Three commits for clean history:
1. `Stickers tab — header redesign + tab renames (Cookbooks / Stickers / Profile)` (2A)
2. `Sticker favorites — server table + API + UI end-to-end` (2B)
3. `Stickers tab — pack card redesign + search modal + library placeholders + Create CTA` (2C, 2D, 2E, 2F, 2G)

---

## Phase 3 — Real library + upload + cutout (DEFERRED, post-vacation)

Outline only. Don't implement now.

| Sub | What | Estimate |
|---|---|---|
| 3A | Photo-upload-as-sticker flow: PhotoTab-style picker → uploads to new `sticker-photos` Supabase bucket → writes `user_images` row with `is_sticker=true` → renders in "Your Stickers" grid | 3 days |
| 3B | "Transform to Sticker" cutout: Edge Function calls OpenAI `images.edit` with a transparent-bg prompt OR uses a background-removal API (rembg, remove.bg) → returns RGBA PNG → uploads as user_image | 4 days |
| 3C | Numbers & Letters pack: generate 29 sticker PNGs via `gpt-image-1` extending current generator, register in `stickerRegistry.ts` | 1 day + ~$1.20 OpenAI |
| 3D | Sticker-count parity with Figma: regenerate to 30–60 per pack via gpt-image-1 prompt expansion. ~$15 OpenAI | 2 days |

Total: ~10 days post-vacation.

---

## Critical files (Phase 1 + 2)

```
NEW:
  src/api/favorites.ts
  src/hooks/useFavoriteStickers.ts
  src/components/stash/StickerSearchModal.tsx
  app/stash/favorites.tsx
  supabase/migrations/20260428000001_sticker_favorites.sql

CHANGED:
  src/lib/stickerRegistry.ts                    # 17 pack arrays + PACK_METADATA expansion
  app/(tabs)/_layout.tsx                        # tab labels + icons
  app/(tabs)/shelves.tsx                        # rename internally if needed (file stays)
  app/(tabs)/stash.tsx                          # wrapper unchanged; renders new StashScreen
  src/components/stash/StashScreen.tsx          # full layout rewrite
  src/components/stash/PackCard.tsx             # visual rewrite
  src/components/stash/PackDetailScreen.tsx    # add heart toggle on preview sheet
  src/components/canvas/StickerTray.tsx         # long-press to favorite
  src/i18n/en.json, uk.json                     # tab + section labels
  supabase/functions/auto-sticker/index.ts     # 17-pack key + guidance update
  FEATURES.md, SCREENS.md, MANUAL_TESTS.md, PLAN.md, CLAUDE.md  # docs

REUSE (no change):
  src/components/stickers/Sticker.tsx           # graceful null on missing source
  src/components/import/PhotoTab.tsx            # template for Phase 3A photo flow
  app/(tabs)/shelves.tsx filter pattern         # template for search modal UI
```

## Out of scope

- Phase 3 (photo-to-sticker upload, Transform cutout, Numbers & Letters pack, sticker-count parity)
- Marketing-brief Phase 8.5B–E (recipe photo upload + frames + watercolor + PDF)
- Generating new sticker PNGs to match Figma's 28-60-per-pack counts
- Renaming any internal `PackId` types — ID strings stay; only display `name` matches Figma
- Persisting favorites to MMKV for offline (server-only via TanStack Query is fine)

## Verification

After Phase 1 + 2 ship:

1. **Build smoke test on TestFlight**: rebuild via `eas build --platform ios --profile production --auto-submit` and install on iPhone.
2. **18 packs render** in the Stickers tab pack grid. Numbers & Letters card shows "Coming soon".
3. **Favorite + unfavorite** a sticker from editor → appears in My favorites carousel on Stickers tab.
4. **Search** for "lemon" → both `core/lemon` and `fruits/lemon-slice` appear; tap → preview sheet → use in recipe.
5. **Tab labels** read Home / Cookbooks / + / Stickers / Profile.
6. Premium account (set via Supabase Studio): all packs unlocked.
7. `git diff --stat` for the three Phase 2 commits touches only the files in the Critical-files list above; no scope creep.

## Open questions for you

1. **"Numbers & Letters" pack** — show as a "Coming soon" card today, or skip displaying it entirely (cleaner) until generated in Phase 3?
2. **Sticker-count parity** — accept that our counts (6–20) won't match the design's (28–60) for now and ship Phase 1+2 with our real counts visible? Or hold and generate more PNGs (Phase 3D) before any Phase 1+2 visual ship?
3. **File renames** — keep `app/(tabs)/{stash,shelves,me}.tsx` filenames OR rename to `{stickers,cookbooks,profile}.tsx`? Filenames don't ship to users (they're just routes); recommend keep to avoid churn but flag as your call.
4. **`Spice Leaves` vs `Spices`** etc. — adopt Figma's exact pack names ("Spice Leaves", "Herb Leaves", "Various Dishes", "Hand-drawn Shapes", "Torn Paper Pieces") even though they're slightly verbose? Or stick with cleaner short names?
