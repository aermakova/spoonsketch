# Continuation prompt

Paste the block below into a fresh Claude session (claude.ai/code on mobile Safari, or any Claude surface connected to this repo). It's self-contained — a new session doesn't have our prior conversation context, so the docs below carry all the state.

---

```
I'm continuing work on Spoon & Sketch. Read these in order before doing anything:

1. CLAUDE.md                                        — project rules + "Running the app on the user's iPhone" (port/tunnel/QR workflow)
2. .claude/plans/shelves-redesign.md               — ACTIVE plan (Phase 1 shipped, Phase 2 pending)
3. .claude/plans/book-templates-paper-atomization.md — previous active plan (Phase F foundation + export + all 6 templates + stickers + strokes all shipped)
4. BUGS.md                                         — canonical bug register (BUG-017 is the newest ✅ Fixed entry)
5. MANUAL_TESTS.md                                 — manual regression scenarios
6. PLAN.md                                         — master phase tracker

## What's shipped so far on main

Recent commits (most recent first):
- d94fc82  Shelves redesign Phase 1: books on wooden shelves
- bcffc01  Plan file for the shelves redesign
- 6dd765d  Phase F: stickers + drawing strokes in the PDF
- bfa508f  Phase F: all 5 remaining templates in the HTML renderer
- e02d454  Phase F export path: Recipe Detail → iOS native print → PDF
- 618161e  Phase F HTML renderer foundation + Classic template
- 20630ce  Phase F foundation: RecipePage JSON schema + serializer
- 8795b7d  BUG-014: per-recipe drawing persistence
- a9c4fdb  BUG-015/016/017: per-recipe canvas state + selected-z + pills scale
- 6dc67ec  Phase A: description as its own movable block
- cd356d5  Phase B: full canvas atomization (9 atoms per template)

## Immediate task (pick one)

### Option A — Tab bar icon swap (~15 min)
The bottom tab bar visually doesn't match the redesign mockup yet. Current icons are emojis (🏠 📚 ✦ 👤). The mockup uses thin outline line icons.

Swap to @expo/vector-icons' Feather set (bundled with Expo SDK 54, no install needed):
  import { Feather } from '@expo/vector-icons';
  <Feather name="home" size={22} color={color} />   // Home
  <Feather name="book-open" size={22} color={color} /> // Shelves
  <Feather name="star" size={22} color={color} />    // Elements
  <Feather name="user" size={22} color={color} />    // Me

Edit `app/(tabs)/_layout.tsx`. Keep the same 4 tabs + FAB. Verify labels still fit one line (we just fixed that regression in BUG-004's cousin). Commit.

### Option B — Shelves redesign Phase 2
Once user provides these assets:
- assets/sprigs/sprig-1.png … sprig-6.png (6 botanical PNGs)
- assets/shelves/wood-shelf.png (horizontal wood plank)

…swap the placeholder paths in:
- src/components/shelves/Sprig.tsx (uncomment SPRIG_SOURCES map)
- src/components/shelves/WoodShelf.tsx (uncomment WOOD_SOURCE)

Then move to Phase 2 of the shelves plan: add `cover_color` + `cover_sprig` columns to `cookbooks`, wire pickers into the Cookbook create/edit modal, surface them in Book Settings for later editing. Migration + API changes + UI, one commit.

### Option C — Phase F remaining chunks
Still open on the PDF renderer:
1. Eraser strokes in the PDF (currently skipped). Needs SVG `<mask>` per layer: non-eraser strokes as the mask's white fill, eraser strokes as black cut-outs, then the layer content clipped by that mask.
2. Server-side Puppeteer on Railway (not Supabase Edge Function — Chromium isn't Deno-compatible). For bulk book export + Lulu ordering. Client-side export ships today; this is deferrable.

## Open questions/decisions (resolved, for reference)

From the shelves redesign:
- Delete: long-press → action sheet (retired swipe-to-delete). ✅
- Recipe count: single PostgREST left-join query (`fetchCookbooksWithCounts`). ✅
- Sprigs: 6 PNGs, user-provided. ✅
- Cover text colour: per-colour baked-in pairings, 6 defined in coverColours.ts. ✅
- Tab IA: keep existing 4 tabs + FAB; only visual refresh. ✅

## Ground rules from CLAUDE.md

- Screens thin; src/api/ pure; server data in TanStack Query only; Zustand is UI-only.
- Anthropic key never in the client bundle.
- TypeScript strict, no `any`.
- Error boundaries on every tab root + editor (already applied via `withErrorBoundary` HOC).
- Don't use emojis in code unless explicitly asked.
- Keep living docs current: BUGS.md + MANUAL_TESTS.md + the active plan file. Rule #8 in CLAUDE.md.

## How to run the app on my iPhone

Detailed in CLAUDE.md § "Running the app on the user's iPhone". TL;DR:
- `npx expo start --lan --port 8082` (home wifi: NOT BELL807 currently; use --tunnel if on BELL807)
- `npx --yes qrcode "exp://$(ipconfig getifaddr en0):8082" -o /tmp/expo-qr.png && open /tmp/expo-qr.png`
- I scan the QR with iPhone Camera app (Expo Go's scanner is gone in recent versions).

## How I work

- Terse updates, not essays.
- New bug → add BUG-NNN row to BUGS.md using existing entries as template.
- New manual-test scenario → MANUAL_TESTS.md under the matching phase.
- Don't commit without me asking.
- When I say "do it" / "keep going", proceed without confirming each step.

Start by: tell me in 2 sentences what state the project is in and which of the three options (A / B / C) you'd recommend tackling first given what's shipped.
```

---

## How to use from the phone

1. Copy the block inside the fenced code above.
2. On your phone, open claude.ai/code (Safari) or whichever Claude surface is connected to the `spoonsketch` repo.
3. New session → paste → send.

## When you're back at the Mac

Pick up from whatever the mobile session did by reading `git log` since `d94fc82` + the plan + bug log. The docs are the source of truth for state.
