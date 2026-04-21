# Spoon & Sketch — Claude Context

You are working on **Spoon & Sketch**, a cozy scrapbook cookbook app for millennials
who want a beautiful, printable family cookbook to give as a gift.

Read this file first. Then read the documents in the order listed below before touching any code.

---

## What this app is (30-second version)

Two layers to every recipe:
- **Structured data** — ingredients, steps, times, tags (practical, cookable from)
- **Scrapbook decoration** — stickers, washi tape, photos, freehand drawing (beautiful, giftable)

The primary use case is a **gift**: decorate a cookbook, write a handwritten dedication with Apple Pencil,
order a real physical book via Lulu xPress, ship it to someone's door — entirely inside the app.

The emotional hook: *"Make mom a cookbook for Mother's Day."*

---

## Read these files in this order

| # | File | Read when |
|---|---|---|
| 1 | `PLAN.md` | Always — master plan, all decisions, phase tracker, north-star test |
| 2 | `ARCHITECTURE.md` | Before writing any client-side code |
| 3 | `BACKEND.md` | Before writing any Edge Function, migration, or API call |
| 4 | `SCREENS.md` | Before building any screen — UX specs, microcopy, empty/error states |
| 5 | `USER_FLOW.md` | Before working on onboarding, notifications, or paywall logic |

> If this file and any other file disagree, the other file is more recent. Trust it.

---

## Tech stack (memorise this)

| Layer | Choice |
|---|---|
| Framework | Expo SDK 52 + TypeScript strict |
| Navigation | Expo Router v3 (file-based, typed routes) |
| Canvas + drawing | `@shopify/react-native-skia` (iOS + Android + Web via CanvasKit WASM) |
| Stroke smoothing | `perfect-freehand` (MIT, 2KB) |
| Server state | TanStack Query v5 |
| Client state | Zustand (canvas elements, undo stack, theme, drawing tools) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) |
| AI | Claude Haiku `claude-haiku-4-5-20251001` via Edge Functions only |
| Telegram bot | Telegraf.js on Railway |
| AI job queue | BullMQ + Upstash Redis |
| Payments | RevenueCat (App Store IAP + Google Play + Stripe web) |
| Analytics | PostHog |
| Error tracking | Sentry |
| Secure storage | expo-secure-store (session tokens) |
| Fast local cache | MMKV (onboarding flags, palette pref, last screen) |
| i18n | i18next + expo-localization — English + Ukrainian |
| PDF | Puppeteer in Supabase Edge Function |
| Print-on-demand | Lulu xPress REST API |

---

## 7 rules you must never break

1. **Screens are thin.** Screen files import hooks and render components. Zero business logic.
2. **`src/api/` is pure.** No React. All functions `async`, throw `ApiError`. No try/catch in components.
3. **Never put server data in Zustand.** TanStack Query owns all server state. Zustand is UI-only.
4. **Anthropic API key never in the client bundle.** All Haiku calls go through Supabase Edge Functions.
5. **TypeScript strict, always.** Run `supabase gen types` after every migration. No `any`.
6. **One `AnalyticsEvent` type entry per new event.** Type lives in `src/lib/analytics.ts`. Update the type first.
7. **Error boundaries on every tab root and the editor.** Canvas crash must not crash the app.

---

## What is NOT in v1 (do not build these)

- Android (validate iOS + Web first)
- Family co-editing / shared cookbooks
- Template marketplace
- User-submitted sticker packs
- Social feed / public cookbook discovery
- Offline-first full sync (MMKV + Realtime is sufficient)
- Custom email service (Supabase magic link is fine)
- Rolling your own IAP (RevenueCat exists)

---

## Current state

Nothing is built yet. All files are **planning and design documents only**.
The design prototype lives in `.claude/samples/spoonsketch-design/` — HTML/CSS/JSX files.
Do not run or screenshot the prototype. Read its source directly for design tokens.

Phase 1 (Foundation + design system) is the starting point.
See the Phase tracker in `PLAN.md` for the full 11-phase roadmap.

---

## Key design decisions (already made — do not revisit)

| Decision | Choice | Why |
|---|---|---|
| Business model | Freemium | AI features are the natural premium gate; they have real running costs |
| Auth | Magic link + Apple + Google via Supabase Auth | No password, lowest friction |
| Tier enforcement | Server-side (Edge Functions + RLS), never client-only | Client checks are trivially bypassed |
| RevenueCat as tier oracle | Its webhook is the only thing that writes `users.tier` | Single source of truth |
| Supabase over custom server | PostgREST + Edge Functions cover all v1 needs | No infra to maintain |
| Telegram bot on Railway | Always-on required for webhooks | Cannot be serverless |
| Lulu xPress for print | REST API, global shipping, handles binding | Do not build print infrastructure |

---

## Design system (quick reference)

**Fonts:** Fraunces (display/titles) · Caveat (handwritten) · Nunito (body/UI) — all support Cyrillic

**Palette variants (user-selectable, app-wide):**
- Terracotta (default): `--bg #f4ecdc` `--accent #c46a4c`
- Sage: `--bg #eef0e4` `--accent #6f8a52`
- Blush: `--bg #f5e7e1` `--accent #c66a78`
- Cobalt: `--bg #e8e5dc` `--accent #2f5c8f`

**Core tokens:** `--paper #faf4e6` · `--ink #3b2a1f` · `--inkSoft #6b5747` · `--inkFaint #a39080`

**Clay buttons:** neumorphic, inset shadow, no border, terracotta background for primary
**Paper grain:** SVG `feTurbulence` overlay, opacity 0.4
**Washi tape:** absolute-positioned divs with `repeating-linear-gradient`

**16 built-in SVG stickers** (100×100 viewBox each):
`tomato` `lemon` `garlic` `basil` `whisk` `spoon` `pan` `wheat`
`strawberry` `flower` `leaf` `heart` `star` `mushroom` `bread` `cherry`

Full sticker AI keywords (for "Make me Sketch" matching) are in `PLAN.md` and `BACKEND.md`.

---

## North-star test

Before any phase is marked done, ask:
> Can a new user install → sign up → paste one recipe link → tap "Make me Sketch" → export a PDF → in under 5 minutes?

Before launch, run the full test (in `PLAN.md` § "North-star test"):
install → sign up → 3 Telegram recipes → Make me Sketch × 3 → Book Builder (cover + dedication) → PDF export → Lulu print order.
If the result looks like something you'd be proud to give as a gift: ship it.

---

## Where things live

```
PLAN.md              Master plan — read first
ARCHITECTURE.md      Client architecture — folder structure, state, nav, API, auth, testing
BACKEND.md           Backend — schema, RLS, Edge Functions, webhooks, push, payments, hosting
SCREENS.md           UX specs — 7 critical-path screens fully specced (more to come)
USER_FLOW.md         User journeys — 9 flows, drop-off risks, analytics events, 30-day timeline

.claude/samples/spoonsketch-design/   HTML/CSS/JSX design prototype (read source, don't run)
  └── spoonandsketch/project/
        ├── styles.css         All design tokens
        ├── stickers.jsx       16 SVG sticker definitions
        ├── ui.jsx             Icon, FoodImage, TabBar, Phone frame components
        ├── screens-core.jsx   Welcome, Library, Create, Detail screens
        └── screens-creative.jsx  Editor, CookMode, Collections, Elements, PDFExport
```
