# Spoon & Sketch — MVP Implementation Plan

> **For any Claude instance picking this up:** Read this entire file before touching code.
> Every architectural decision here was made deliberately. The "why" is documented inline.
> The north-star test is at the bottom of this file — run it mentally before marking any phase done.

---

## 📁 Companion documents — read these too

This file is the master plan. The documents below expand on specific concerns.
**Do not duplicate their content here — reference them.**

| File | What it covers |
|---|---|
| `SCREENS.md` | Screen-by-screen UX specs: UI elements, user actions, empty/error states, microcopy, navigation pattern. Critical path (7 screens) fully specced. |
| `USER_FLOW.md` | Full end-to-end user journeys: first-time, onboarding, login, main task loop, Telegram, notifications, paywall, Cook Mode. Drop-off risks + analytics events list. |
| `ARCHITECTURE.md` | Client-side production architecture: folder structure, state management (TanStack Query + Zustand split), navigation setup, API layer, auth handling, local storage tiers, env config, error handling (3 layers), analytics hooks (PostHog), testing structure (unit + integration + Maestro E2E). |
| `BACKEND.md` | Full backend plan: production-ready SQL schema with RLS + triggers, all Edge Function implementations (extract-recipe, auto-sticker, generate-pdf, lulu-webhook, revenuecat-webhook, telegram-auth), file upload strategy, push notification flow, subscription logic, Telegram bot code, admin panel, security rules, hosting scale path. |

> **If PLAN.md and a companion file disagree, the companion file is more recent and correct.**
> The database schema in `BACKEND.md` supersedes the schema section below (it adds triggers, counters, RLS policies, full indexes, and corrected column names).
> The folder structure in `ARCHITECTURE.md` supersedes the file structure section below (it is more granular and accurate).

---

## What this app is

**Spoon & Sketch** is a cozy scrapbook cookbook app for millennials who want a beautiful,
printable family cookbook but can't draw. The primary use case is a **gift** — you make a
decorated cookbook and either print it at home or order a physical bound copy shipped
directly to the recipient.

Two layers to every recipe:
- **Structured data layer** — ingredients, steps, times, tags (practical, cookable from)
- **Scrapbook decoration layer** — stickers, washi tape, photos, handwriting, drawings (beautiful, giftable)

The product is emotional. A physical cookbook you made yourself, with a handwritten
dedication page, is irreplaceable. That is the core value proposition.

---

## Core features

These are the features that define the product. Without any one of them, the app is not Spoon & Sketch.

- **Recipe management** — create, edit, import (manual / URL / screenshot), organise into cookbooks and collections
- **Scrapbook canvas editor** — place stickers, washi tape, text, photos on a recipe page; move, rotate, scale each element
- **Freehand drawing** — draw on any canvas page with finger or Apple Pencil; variable stroke width, opacity, blend modes, multiple layers
- **"Make me Sketch"** — one-tap AI auto-decoration: Claude Haiku reads the recipe and places relevant stickers automatically
- **Recipe import via Telegram bot** — send a link or screenshot to the bot, recipe appears in the app within 30 seconds
- **In-app recipe import** — paste a URL or upload a screenshot directly inside the app (same AI pipeline as bot)
- **Book builder** — assemble a full book: cover, dedication, about, chapter dividers, recipe pages, TOC, closing page
- **Handwritten dedication** — write a personal message with Apple Pencil (or mouse/touch) on the dedication page
- **PDF export** — generate a full-book PDF in Scrapbook style (decorated) or Clean style (minimal)
- **Print-on-demand** — order a physical bound book via Lulu xPress, shipped to any address
- **Cook Mode** — step-by-step cooking view with screen-on, progress indicators, and per-step ingredient checklist
- **4 palette themes** — Terracotta, Sage, Blush, Cobalt — applied app-wide, user-selectable
- **English + Ukrainian** — full UI localisation, Haiku responds in user's language

---

## Nice-to-have features

Real features worth building — but only after the core loop is validated.

| Feature | Why it waits |
|---|---|
| Android support | Validate on iOS + Web first; Expo makes the port straightforward once stable |
| Family / co-editing cookbooks | Adds real-time conflict resolution; complex for v1 |
| Template marketplace | Designers sell page templates; needs moderation + payment split |
| User-submitted sticker packs | Needs moderation pipeline |
| Social sharing / public cookbooks | Growth feature — not needed to deliver the gift |
| Safari / Chrome share extension | "Share to Spoon & Sketch" from any browser; Telegram bot covers import in v1 |
| Offline-first canvas editing | Full offline needs local SQLite + sync logic; MMKV cache covers most cases |
| Multiple bot languages | Bot is English-only in v1; UI already supports EN + UK |
| Subscription billing tiers | Validate pricing model before locking in tiers |
| AI recipe suggestions | "You might like…" based on your cookbook; v2 engagement feature |
| Voice step narration in Cook Mode | Useful but not core to the gift use case |

---

## User flow — signup to first completed page

This is the critical path. Every friction point here costs users.

```
1. INSTALL
   └─ Onboarding splash (app logo, stickers, "Get started")

2. ONBOARDING (5 steps, no account yet)
   ├─ Value prop: "Make a cookbook as a gift"
   ├─ Demo: "Make me Sketch" before/after
   ├─ Import options shown (Telegram / URL / manual)
   ├─ Intent picker: "A gift" OR "My own cookbook"
   └─ Palette picker: choose style

3. SIGN UP
   └─ Magic link (email) OR Apple OR Google
       └─ First cookbook auto-created from intent choice

4. HOME
   └─ "Your shelves" shows the new cookbook
       └─ "Add your first recipe" prompt

5. ADD A RECIPE (three paths, all land in same place)
   ├─ A. Paste link → Haiku extracts → review form → Save
   ├─ B. Upload screenshot → Haiku extracts → review form → Save
   └─ C. Type manually → fill form → Save

6. DECORATE
   ├─ From recipe detail: tap "Make it a scrapbook page"
   ├─ Tap "Make me Sketch" → AI places stickers automatically
   └─ User adjusts / adds more elements if desired

7. BUILD THE BOOK
   ├─ Open Book Builder
   ├─ Cover page: title + photo + palette
   ├─ Dedication page: write message with Pencil / touch
   └─ Recipe pages auto-populated from decorated recipes

8. EXPORT / PRINT
   ├─ PDF export → download or share
   └─ Print order → enter recipient address → pay → Lulu ships
```

**Shortest possible happy path:** install → sign up → paste one link → Make me Sketch → export PDF → under 5 minutes.

---

## Backend needs

| Need | Solution | Notes |
|---|---|---|
| User auth | Supabase Auth | Magic link + Apple + Google. JWT stored in expo-secure-store. |
| Database | Supabase PostgreSQL | 14 tables, full schema in this file. RLS on every table. |
| File storage | Supabase Storage | Buckets: `recipe-images`, `user-images`, `canvas-thumbnails`, `pdf-exports`. CDN included. |
| Realtime | Supabase Realtime | Recipe appears in app the moment Telegram bot saves it. Also used for print order status updates. |
| AI processing queue | BullMQ + Redis (Upstash) | All Haiku calls are async. Never block the UI. Results pushed via Realtime. |
| Serverless functions | Supabase Edge Functions (Deno) | PDF generation, auto-sticker, telegram auth token exchange, recipe URL scraping |
| Telegram bot server | Telegraf.js on Railway | Always-on Node.js service. Receives Telegram webhooks, pushes to BullMQ. |
| PDF generation | Puppeteer inside Edge Function | Renders HTML template with embedded PNG canvas snapshots |
| Email | Supabase Auth built-in | Magic link emails only. No custom email service needed in v1. |
| Push notifications | Expo Push Notifications | "Your print order has shipped", "Recipe imported from Telegram" |

**No custom auth server, no separate API server.** Supabase Edge Functions cover all backend logic. The only separate service is the Telegram bot (must be always-on for webhook).

---

## APIs needed

| API | Purpose | Auth type | Cost model |
|---|---|---|---|
| **Anthropic API** (Claude Haiku) | Recipe extraction from URL/image, auto-sticker placement | API key (server-side only, never expose to client) | Per token. Haiku is ~25× cheaper than Sonnet. Enable prompt caching. |
| **Telegram Bot API** | Receive recipe links/screenshots from users via bot | Bot token (Telegraf) | Free |
| **Lulu xPress API** | Submit print orders, get pricing, track status | OAuth2 / API key | Per order (Lulu takes margin, you mark up) |
| **RevenueCat API** | In-app purchases, subscription management | API key | Free up to $2.5k MRR, then 1% |
| **Supabase API** | Database, auth, storage, realtime, edge functions | Anon key (client) + Service role key (server) | Free tier generous; paid from ~$25/mo |
| **Expo Push API** | Send push notifications to iOS/Android | Expo access token | Free |
| **Google Fonts** | Load Fraunces, Caveat, Nunito | No auth (CDN) | Free |
| **Apple Sign In** | Required for App Store if offering any social login | Apple Developer account | Free (requires $99/yr dev account) |
| **Google Sign In** | Optional social login | Google Cloud Console OAuth | Free |

**Keys that must NEVER be in client-side code:** `ANTHROPIC_API_KEY`, `LULU_API_KEY`, Supabase service role key. All Haiku calls go through Supabase Edge Functions.

---

## Monetization options

Three realistic models for this app. Decision is still open (see Open questions).

### Option A — Freemium (recommended)
Free tier is genuinely useful; premium unlocks the best parts.

| | Free | Premium (~$5–8/mo or ~$40/yr) |
|---|---|---|
| Cookbooks | 3 | Unlimited |
| Recipes | 30 | Unlimited |
| Built-in stickers | All 16 | All current + future packs |
| PDF export | Watermarked | No watermark |
| Print orders | 1/month | Unlimited |
| AI auto-sticker | 5 uses/month | Unlimited |
| Telegram bot | ✅ | ✅ Priority queue |

Revenue from subscriptions (RevenueCat) + print order markup (Lulu cost + your margin).

### Option B — One-time purchase (~$4.99)
Single upfront payment, all features unlocked. Simple.
- No recurring revenue
- Good for App Store featuring ("pay once, keep forever" angle)
- Add-on: sticker packs as separate IAP ($0.99–$1.99 each)

### Option C — Print-first, app is free
App is completely free. Revenue comes exclusively from print orders.
- Low barrier to adoption
- Depends on conversion to print (risky if users just export PDF)
- Lulu wholesale + markup (~$8–15 per book depending on size)

**My recommendation:** Option A (freemium). The AI features (auto-sticker, Telegram bot) are the natural premium gate — they have real running costs and are the most magical parts of the product. Print markup provides secondary revenue regardless of tier.

---

## MVP scope — what ships in v1

Everything in this list ships. Nothing else.

**Screens (18 total):**
Onboarding (7 steps) · Home · Library (shelf + index) · Import Recipe · Create/Edit Recipe · Detail (scrapbook + clean) · Canvas Editor (canvas + templates + drawing mode) · Cook Mode · Collections · My Elements · PDF Export · Book Builder · Book page editors (cover, dedication, about, chapter divider) · Print Order · Telegram Connect · Profile & Settings · Plans & Pricing · Tablet/Web layout

**Features:**
- Email magic link + Apple Sign In auth
- Recipe CRUD (manual + URL import + screenshot import + Telegram bot)
- 16 built-in SVG stickers
- Canvas editor: stickers, washi tape, text, photos, templates
- Freehand drawing: layers, blend modes, Apple Pencil pressure
- "Make me Sketch" auto-decoration
- Book builder with all page types
- 4 palette themes
- PDF export (scrapbook + clean styles, A4 + A5)
- Print-on-demand via Lulu xPress
- Cook Mode with screen-on
- English + Ukrainian UI
- Freemium tiers via RevenueCat
- Push notifications (print shipped, recipe imported)
- iOS + Web (one codebase, Expo)

---

## What to avoid building at the start

| Avoid | Reason |
|---|---|
| Android | Validate product on iOS + Web first. Expo makes the port trivial once you have a stable build. |
| Custom auth server | Supabase Auth handles everything. Do not build JWT issuance yourself. |
| Rolling your own IAP | RevenueCat exists. In-app purchase is a compliance minefield — don't touch it raw. |
| Real-time collaborative editing | Adds operational transforms / CRDTs complexity. No use case requires it in v1. |
| Offline-first full sync | MMKV cache + Supabase Realtime is sufficient. Full offline (SQLite + conflict resolution) is weeks of extra work. |
| Family sharing / cookbook permissions | Adds multi-user data model complexity. Private cookbooks only in v1. |
| Social feed / public cookbooks | Discovery and social graph are separate products. Not needed for the gift use case. |
| Custom email service | Supabase magic link emails are fine for v1. Do not set up SendGrid/Postmark yet. |
| Template marketplace | Needs seller accounts, revenue split, moderation. Post-launch. |
| Your own print infrastructure | Lulu xPress exists and is reliable. Do not build print pipelines. |
| Scraping every recipe site perfectly | Handle the common sites (NYT Cooking, Smitten Kitchen, BBC Good Food). Graceful degradation for everything else — show what was extracted and let the user fix it. |

---

## Design source

The visual design lives in `.claude/samples/scrabooka-design/scrabooka/project/`.
The prototype is called "Scookie" internally. The production app is **Spoon & Sketch**.

Key design files:
- `styles.css` — all design tokens, clay button styles, paper grain, typography
- `ui.jsx` — Icon, FoodImage, Tag, Meta, StatusBar, Phone, TabBar components
- `stickers.jsx` — all 16 SVG sticker definitions (100×100 viewBox each)
- `screens-core.jsx` — Welcome, Library, CreateRecipe, Detail screens
- `screens-creative.jsx` — Editor, CookMode, Collections, MyElements, PDFExport

Implement pixel-faithfully in React Native. Match visual output; do not copy
prototype internal structure.

---

## Tech stack

| Layer | Package | Reason |
|---|---|---|
| Framework | Expo SDK 52 + TypeScript | iOS + Android + Web from one codebase |
| Navigation | Expo Router (file-based) | Works with web SSR, deep links |
| Canvas / drawing | `@shopify/react-native-skia` | Runs on iOS, Android, Web (WebAssembly/CanvasKit). Handles sticker rendering, path drawing, layer compositing, blend modes, snapshot to PNG |
| Stroke smoothing | `perfect-freehand` (MIT, 2KB) | Smooth pressure-sensitive strokes from raw pointer events. No bezier math needed. |
| SVG stickers | `react-native-svg` | Render 16 built-in stickers on all platforms |
| Gestures | `react-native-gesture-handler` | Pan, pinch, rotate for sticker transforms; pointer events for Apple Pencil pressure |
| Fonts | `expo-font` | Fraunces + Caveat + Nunito from Google Fonts |
| State (canvas/local) | `zustand` | Canvas element transforms, undo/redo stack, drawing tool state |
| State (server) | `@tanstack/react-query` | Recipe fetching, mutations, cache |
| Local storage | `expo-secure-store` + `@react-native-mmkv/core` | Session tokens (secure), fast cache (MMKV) |
| Database / Auth / Storage | `@supabase/supabase-js` | PostgreSQL + Auth + Storage + Realtime + Edge Functions in one. Row Level Security for multi-user isolation. |
| AI | `@anthropic-ai/sdk` | Claude Haiku for recipe extraction and auto-sticker placement |
| Telegram bot | `telegraf` (Node.js) | Deployed on Railway. Handles webhook, sends jobs to queue. |
| Job queue | `bullmq` + Redis (Upstash) | Async AI processing. Never blocks UI. Results pushed via Supabase Realtime. |
| PDF generation | Puppeteer (Supabase Edge Function) | Server-side PDF from canvas snapshots + recipe data |
| Print-on-demand | Lulu xPress REST API | User pays in-app → Lulu prints and ships physical book to any address |
| Animations | `react-native-reanimated` | Sticker placement animations, canvas transitions |
| i18n | `i18next` + `react-i18next` + `expo-localization` | English + Ukrainian. Device language auto-detected. Cyrillic covered by all 3 chosen fonts (Nunito, Fraunces, Caveat support Ukrainian via Google Fonts — no font swap needed) |

### Web note
Expo Router with React Native Web. React Native Skia renders on web via CanvasKit
(~8MB WASM). Bundle is heavier but acceptable for a creative tool with long session times.
The tablet editor design from the prototype IS the web/desktop layout — dark sidebar,
wide canvas, right panel.

### Apple Pencil note
`react-native-gesture-handler` pointer events expose `pressure` (0–1) on Apple Pencil.
Pass directly to `perfect-freehand` options. No additional native module needed for v1.

---

## Design tokens

```typescript
// src/theme/colors.ts
export const colors = {
  bg:             '#f4ecdc',
  bg2:            '#ede2ce',
  paper:          '#faf4e6',
  paperSoft:      '#f7eedb',
  ink:            '#3b2a1f',
  inkSoft:        '#6b5747',
  inkFaint:       '#a39080',
  line:           '#e6d7bc',
  terracotta:     '#c46a4c',
  terracottaSoft: '#e9a488',
  terracottaDark: '#b85a3e',
  ochre:          '#d9a441',
  sage:           '#8c9f6e',
  plum:           '#8a5f7a',
  tomato:         '#b94a38',
  butter:         '#f2d98d',
  rose:           '#d97b7b',
}

// 4 palette variants — user can switch app-wide
export const palettes = {
  terracotta: { bg: '#f4ecdc', bg2: '#ede2ce', paper: '#faf4e6', accent: '#c46a4c', accentDark: '#b85a3e', accentLight: '#d87a5c' },
  sage:       { bg: '#eef0e4', bg2: '#e4e8d4', paper: '#f7f8ec', accent: '#6f8a52', accentDark: '#567040', accentLight: '#88a06a' },
  blush:      { bg: '#f5e7e1', bg2: '#eed6cd', paper: '#faefe9', accent: '#c66a78', accentDark: '#a84f5e', accentLight: '#d98598' },
  cobalt:     { bg: '#e8e5dc', bg2: '#dcd8ca', paper: '#f5f1e6', accent: '#2f5c8f', accentDark: '#214470', accentLight: '#3f75b0' },
}

// src/theme/fonts.ts
export const fonts = {
  display:  'Fraunces',   // recipe titles, section headers, cookbook cover
  hand:     'Caveat',     // handwritten marginalia, labels, dedications
  body:     'Nunito',     // all UI, ingredients, steps
}
```

---

## Screens

> **See `SCREENS.md` for the full UX spec of each screen** (UI elements, microcopy, empty states, error states, navigation pattern).
> The specs below are the acceptance-criteria reference. SCREENS.md is the design reference.

### Tab bar (always visible)
`Home | Shelves | + (FAB, terracotta gradient) | Elements | Me`

The FAB (+) lifts 22px above the bar on iOS/Android, sits inline on web.

---

### 01 · Welcome / Home
**Route:** `/` (tabs/index)

Content:
- Painterly header panel (full-width, 340px tall on 360px phone) — food image placeholder with gradient overlay, username greeting in Caveat, cookbook title in Fraunces
- Corner stickers: leaf + tomato scattered on header
- "Today's pick" card — random recipe suggestion
- "Your shelves" horizontal scroll — up to 3 cookbook cards, each with food image, sticker, name, recipe count
- "See all" link to Shelves tab

Acceptance criteria:
- [ ] Header renders paper-grain texture overlay
- [ ] Palette theme applies to accent color on "See all" and FAB
- [ ] Today's pick card navigates to recipe detail
- [ ] Shelves scroll horizontally without showing scrollbar

---

### 02a · Library — Shelf view
**Route:** `/shelves` with view=shelf param

Content:
- Header: "my kitchen" (Caveat) + "Cookbook" (Fraunces 32px)
- Filter icon button (top right)
- Search bar with inset shadow
- Tag filter pills: All · Favorites · Quick · Veg · Baking · Soups (horizontal scroll)
- 2-column grid of recipe cards, slight alternating rotation (±0.6deg)
- Each card: food image (square, aspect 1:1), sticker bottom-left, title, time, tag pill
- Favorites show heart icon top-right of image
- Wooden shelf divider between rows (gradient bar)
- Tab bar floating at bottom

Acceptance criteria:
- [ ] Tag filter "All" active by default (terracotta bg)
- [ ] Cards rotate alternately ±0.6deg
- [ ] Sticker peeks below image edge (overflow visible on card)
- [ ] Shelf divider rendered between row 1 and row 2

---

### 02b · Library — Index view
**Route:** `/shelves` with view=index param

Content:
- Header: "Recipes" (Fraunces 32px) + recipe count right-aligned
- Search bar + grid/list toggle
- List of recipe rows: food image (78×78), title, time, servings, tags, heart icon
- Subtle rotation on rows (±0.3deg)
- First row has washi tape corner decoration
- Tab bar floating at bottom

Acceptance criteria:
- [ ] Grid/list toggle switches between 02a and 02b
- [ ] Washi tape only on first visible row

---

### 03a · Import Recipe (entry point before Create)
**Route:** `/recipe/import`

Shown when user taps the + FAB. Three options on one screen — user picks how to add:

**Option A — Paste a link**
- Text input: "Paste any recipe URL…"
- "Import" button → calls Edge Function → scrapes URL with Cheerio → Claude Haiku extracts recipe
- Loading state: "Reading recipe…" with animated sticker (tomato spinning)
- On success: pre-fills Create Recipe form (03b), user reviews and saves

**Option B — Upload a screenshot**
- "Choose photo" button → opens image picker (camera or library)
- Selected image previewed in card
- "Extract recipe" button → uploads image to Supabase Storage → Claude Haiku vision extracts recipe
- Same loading state and success flow as Option A

**Option C — Type it yourself**
- "Start from scratch" button → opens blank Create Recipe form (03b)

All three options land on the same 03b form — the difference is whether it arrives pre-filled or blank.

Acceptance criteria:
- [ ] URL scraping handles paywalled sites gracefully (shows partial data + "we couldn't read everything")
- [ ] Image upload max 20MB (Haiku vision limit)
- [ ] Haiku responds in user's current language (EN or UK)
- [ ] Pre-filled form is fully editable before saving
- [ ] If extraction fails, form opens blank with error toast, source URL preserved

---

### 03b · Create / Edit Recipe
**Route:** `/recipe/create` (new) · `/recipe/[id]/edit` (existing)

Content:
- Top bar: close X · "New Recipe" / "Edit Recipe" · Save (terracotta button)
- Cover photo area (180px tall, full width minus 16px margin) with "Change" button overlay + leaf sticker
- Title field (Fraunces 26px) + subtitle field (Caveat 18px, handwritten note)
- Quick stats row: Prep · Cook · Serves (3 equal cards with icon, value, label)
- Ingredients section (card with dashed border rows + "Add" button)
- Steps section (numbered circles with butter gradient, "Add a step" footer)
- Tags row (pill tags + "+ tag" add button)
- Source URL row (link icon + URL display, read-only if imported)
- "Make it a scrapbook page" floating dark bar at bottom (brush icon, arrow right)

Acceptance criteria:
- [ ] All fields are editable (not just display)
- [ ] Ingredient rows have checkbox (for cook mode later)
- [ ] "Make it a scrapbook page" bar navigates to editor with this recipe pre-loaded
- [ ] Save button creates recipe in Supabase and returns to library

---

### 04a · Recipe Detail — Scrapbook view
**Route:** `/recipe/[id]?view=scrapbook`

Content:
- Top nav: back arrow · "Scrapbook" pill toggle · heart
- Full scrapbook canvas (560px tall card with paper grain)
  - Food image (tilted -1.5deg, polaroid-style with shadow)
  - Washi tape strips (2 decorative pieces)
  - Title in Fraunces + Caveat subtitle
  - Stickers scattered (tomato, basil) with natural rotation
  - Ingredients column (Caveat header, dashed separator, bullet list)
  - Step polaroids on right (2 mini photo frames with hand notes)
  - Sticky note at bottom (butter yellow, taped, slight rotation)
- Footer buttons: "Clean view" · "Start cooking" (primary)

Acceptance criteria:
- [ ] Toggling "Clean view" navigates to 04b
- [ ] Canvas is read-only here (edit via editor)
- [ ] "Start cooking" navigates to Cook Mode

---

### 04b · Recipe Detail — Clean view
**Route:** `/recipe/[id]?view=clean`

Content:
- Hero food image full width (240px tall)
- Nav overlaid on image: back · "Clean" toggle · share
- Bleed card (border-radius top 32px, slides up 28px over image)
- Tags, title, description
- Stat strip: Prep · Cook · Serves with dashed divider below
- Ingredients list (dot bullets)
- Method steps (numbered circles with butter gradient, dashed dividers)
- Footer: "Scrapbook" button · "Start cooking" primary

Acceptance criteria:
- [ ] Toggling "Scrapbook" navigates to 04a
- [ ] Share button opens system share sheet with recipe text

---

### 05a · Page Editor — Canvas-first
**Route:** `/editor/[recipeId]`

Content:
- Dark background (#2a1f16)
- Top bar: close · recipe name · preview eye · Save (terracotta)
- Canvas (paper #faf4e6, border-radius 18, fills most of screen)
  - Editable elements: food image, title text, stickers, ingredient zone, step zone
  - Selected element shows dashed outline + 4 corner handles + rotation handle above
- Context toolbar (appears when element selected): Replace · Size · Rotate · Layer · Delete
- Bottom tool panel (dark, rounded top): tabs Layouts · Stickers · Photos · Text · Tape
  - Active tab shows tray: sticker grid (54×54 tiles, horizontal scroll)

Acceptance criteria:
- [ ] Each element is independently selectable, movable, rotatable, scalable
- [ ] Rotation handle works via drag gesture
- [ ] Sticker tray scrolls horizontally
- [ ] First sticker tile shows selected state (butter border)
- [ ] Canvas snapshot on Save → stored as thumbnail
- [ ] Undo/redo via shake or toolbar button (stack depth: 50)

---

### 05b · Page Editor — Templates-first
**Route:** `/editor/[recipeId]/templates`

Content:
- Top bar: back arrow · "Choose a Page Style"
- Live preview of selected template (280px tall, paper card)
- Template grid (3 columns, aspect 3:4): Journal · Postcard · Polaroid · Recipe Card · Magazine · Diary
- Active template shows terracotta ring outline
- "Decorate this page" primary button at bottom

Acceptance criteria:
- [ ] Selecting a template updates preview in real time
- [ ] "Decorate this page" applies template to canvas and opens 05a

---

### 05c · Drawing Mode (sub-layer of editor)
**Route:** Drawing panel accessible from editor brush tab

Content:
- Drawing tool active on canvas — touch/Pencil draws strokes
- Tool options: stroke width slider (1–40px) · opacity slider (0–1) · color picker
- Layer panel (slide up from bottom or side panel on tablet):
  - List of 3–5 layers, each with: name, visibility eye, opacity, blend mode dropdown
  - Blend modes: Normal · Multiply · Overlay · Screen · Soft-light
  - Drag to reorder, swipe to delete, + button to add
- Eraser tool
- Undo/redo

Acceptance criteria:
- [ ] Apple Pencil pressure maps to stroke width variation (thinning)
- [ ] Finger input uses simulated pressure (softer strokes)
- [ ] Multiply blend mode over cream paper produces watercolour wash effect
- [ ] Layer reorder updates z-order immediately
- [ ] Strokes serialize to `{points: [{x,y,pressure}], width, color, opacity}` for DB storage

---

### 06 · Cook Mode
**Route:** `/cook/[recipeId]`

Content:
- "Cook Mode · Screen On" pill with pulsing indicator (expo-keep-awake active)
- Step progress pills (4 segments, completed = terracotta, current = soft terracotta, future = faint)
- Current step card: "step three" in Caveat, step text in Fraunces 30px bold, tip card below (flame icon, oven info)
- Sticker decorating the step card corner
- Per-step ingredient checklist: checkbox rows, checked = strikethrough + sage bg
- Navigation: back arrow (small) · "Done · next step →" (primary, full width)

Acceptance criteria:
- [ ] `expo-keep-awake` prevents screen sleep when Cook Mode is active
- [ ] Checking an ingredient persists for the session (local state, not DB)
- [ ] Final step "Done · next step" changes to "Finished! 🎉"
- [ ] Closing cook mode asks confirmation if mid-recipe

---

### 07 · Collections / Shelves
**Route:** `/shelves` (collections tab)

Content:
- Header: "my shelves" (Caveat) + "Collections" (Fraunces 32px) + + button
- 2-col grid of collection cards (slight rotation each, paper grain)
  - Stacked polaroid previews (2 food images, slightly rotated, overlapping)
  - Sticker peeking from lower-right corner
  - Washi tape strip on alternate cards
  - Collection name (Fraunces 14px bold) + recipe count

Acceptance criteria:
- [ ] + button creates new collection with name input
- [ ] Long-press on collection shows rename/delete options
- [ ] Tapping collection navigates to filtered library view

---

### 08 · My Elements
**Route:** `/elements`

Content:
- Header: "personal stash" (Caveat) + "My Elements" (Fraunces 30px)
- Segmented tabs: Stickers · Photos · Tapes · Text
- Upload card (dashed border, + icon, "Upload your own")
- Sticker tab: 4-col grid (16×16px rounded tiles), favorite heart on first, count label
- Photos tab: 3-col grid of uploaded images

Acceptance criteria:
- [ ] Upload triggers image picker (camera or library)
- [ ] Uploaded images stored in Supabase Storage under `user-images/{userId}/`
- [ ] Uploaded stickers appear in editor sticker tray
- [ ] Max upload size enforced: 10MB per image

---

### 09 · PDF Export
**Route:** `/export`

Content:
- Header: close · "Export to PDF"
- Style toggle: Scrapbook (decorated) · Clean (minimal) — both show mini preview
- Scope selector (radio group): This recipe · Selected recipes · A whole collection
- Options row: Paper texture · Page size (A5 portrait default)
- Export button: "Export 3 pages · PDF" (shows page count)

Acceptance criteria:
- [ ] Scrapbook PDF uses canvas snapshots (PNG) embedded in PDF
- [ ] Clean PDF uses server-side recipe layout (no canvas)
- [ ] PDF generates server-side (Edge Function), user gets download link
- [ ] Link expires after 7 days

---

### 10 · Book Builder
**Route:** `/book/[cookbookId]`

Content:
- Overview of all pages in the book (ordered list)
- Page types: Cover · Dedication · About/Intro · Chapter Divider · [Recipe pages] · Blank · Table of Contents (auto) · Closing
- Add page button (+ between pages)
- Reorder pages by drag
- Tap any page to edit it in canvas editor

Acceptance criteria:
- [ ] TOC auto-generates from recipe pages (title + page number)
- [ ] Dragging reorders pages and updates `position` in DB
- [ ] Deleting a recipe page does NOT delete the recipe itself
- [ ] Minimum book: cover + at least 1 recipe page

---

### 11 · Book Page Editors

**11a · Cover Page**
- Full canvas editor pre-loaded with cover template
- Fields: book title, author name, year, cover photo
- 4 palette themes apply here
- Apple Pencil: can draw/write on cover

**11b · Dedication Page** ← emotional heart of the gift
- Canvas with lined paper template
- Caveat font text block: "For [name]..."
- Apple Pencil handwriting — this is the PRIMARY input here
- Drawing layer for handwritten message
- Optional photo placement

**11c · About / Intro Page**
- Text blocks (Caveat + Nunito)
- Photo placement
- Stickers + washi tape decoration

**11d · Chapter Divider**
- Single page: chapter title in Fraunces
- Decorative stickers, washi tape
- Palette-matched background

Acceptance criteria:
- [ ] Dedication page prompts user to use Apple Pencil if on iPad
- [ ] All book pages serialize to canvas_id for consistent rendering
- [ ] Book page order is reflected correctly in final PDF

---

### 12 · Print Order
**Route:** `/print/[cookbookId]`

Content:
- Book preview (thumbnail of cover)
- Format selector: A5 Softcover · A5 Hardcover · A4 Hardcover
- Recipient details: name, email, shipping address
- Price breakdown (fetched from Lulu API)
- Order button → Stripe checkout (or Lulu direct payment)
- Order status tracking after placement

Acceptance criteria:
- [ ] PDF is generated and uploaded to Supabase Storage before submitting to Lulu
- [ ] Lulu order ID stored in `print_orders` table
- [ ] User receives email confirmation (from Lulu directly)
- [ ] Status polling: `print_orders.status` updates via webhook from Lulu
- [ ] Error state shown if Lulu API fails

---

### 13 · Telegram Connect + Bot flow
**Route:** `/me/telegram`

Content:
- Connect Telegram button → deep link to bot with auth token
- Once connected: shows @username, disconnect option
- Bot instructions: "Send me any recipe link or photo"

Bot behavior:
- User sends link → bot extracts recipe via Claude Haiku → creates recipe in app → sends confirmation
- User sends screenshot → bot uploads image → Haiku extracts recipe → creates recipe → confirms
- Bot sends back: recipe title + "Open in app" deep link

Acceptance criteria:
- [ ] Auth token is one-time-use (invalidated after connect)
- [ ] Bot responds within 30 seconds (queue processing)
- [ ] Failed extraction sends friendly error message to Telegram
- [ ] Recipe appears in app immediately after Supabase Realtime event

---

### 15 · Profile & Settings
**Route:** `/me`

Content:
- Avatar (tappable to change) + username + email (read-only)
- **Palette theme picker** — 4 swatches (Terracotta · Sage · Blush · Cobalt), applies app-wide
- **Paper texture intensity** — Low · Medium · High toggle
- Connected accounts section: Telegram (connect/disconnect)
- Notifications toggle (Expo Push Notifications)
- "Upgrade to Premium" banner (if free tier) → navigates to Plans screen
- Current plan badge (Free / Premium)
- Sign out
- Delete account (destructive, confirmation required)

Acceptance criteria:
- [ ] Palette change applies immediately across all screens (via zustand theme store)
- [ ] Telegram connect/disconnect works from this screen
- [ ] "Delete account" requires typing "DELETE" to confirm, then cascade-deletes all user data via Supabase RLS
- [ ] Sign out clears session from expo-secure-store

---

### 16 · Plans & Pricing
**Route:** `/me/plans`

> **Note:** Final pricing tiers depend on the unanswered business model question.
> This spec covers the screen structure; fill in prices once decided.

Content:
- Header: "Choose your plan" (Fraunces display)
- Two plan cards side by side (or stacked on small phone):

**Free tier card:**
- Price: $0
- Features:
  - Up to 3 cookbooks
  - Up to 30 recipes
  - 16 built-in stickers
  - PDF export (watermarked)
  - 1 print order per month

**Premium tier card** (terracotta ring, recommended):
- Price: $X/month or $Y/year (TBD)
- Features:
  - Unlimited cookbooks + recipes
  - All built-in stickers + future packs
  - PDF export (no watermark)
  - Unlimited print orders
  - Priority AI processing (auto-sticker + Telegram bot)
  - Early access to new templates

- "Start free trial" (7-day) primary button on Premium card
- "Continue with Free" secondary text link
- Restore purchases link (required for App Store)
- Terms + Privacy links (required for App Store)

Acceptance criteria:
- [ ] Payment handled via **RevenueCat** (handles App Store IAP, Google Play IAP, and Stripe for web in one SDK — do not roll your own IAP)
- [ ] Purchasing on one platform restores on others via RevenueCat
- [ ] Free tier limits enforced server-side (Supabase RLS + Edge Function checks), not just client-side
- [ ] Watermark on free PDF export applied during PDF generation (Edge Function)
- [ ] "Restore purchases" button visible and functional (App Store requirement)

---

### 00 · Onboarding (first launch only)
**Route:** `/onboarding` — shown once, skipped after completion stored in MMKV

Onboarding is 5 steps. No account required until step 5 — let users see the value first.

**Step 1 — Splash / Hero**
- Full-screen painterly food image background
- App logo: "Spoon & Sketch" in Fraunces (large) + Caveat subtitle "a scrapbook cookbook"
- Stickers scattered: tomato, leaf, cherry decorating the screen
- "Get started" primary clay button
- "I already have an account" text link → goes to sign in

**Step 2 — The gift angle**
- Headline: "Make a cookbook someone will keep forever" (Fraunces)
- Subtext: "Decorate recipes with stickers, add a handwritten dedication, order a real printed book."
- Illustration: polaroid-style mockup of a finished cookbook page (use FoodImage + stickers)
- Progress dots (1 of 3)

**Step 3 — Zero effort, beautiful result**
- Headline: "Beautiful with one tap"
- Subtext: "Hit "Make me Sketch" and the app decorates your recipe automatically."
- Animation or static: before (plain recipe) → after (stickered scrapbook page)
- Progress dots (2 of 3)

**Step 4 — Import from anywhere**
- Headline: "Add recipes your way"
- Three options illustrated:
  - Telegram bot — send a link, get a recipe
  - Paste a URL — any recipe site
  - Type it yourself
- Progress dots (3 of 3)

**Step 5 — Intent picker** ← sets up the first cookbook automatically
- Headline: "What are you making?" (Fraunces)
- Two large cards (tap to select):
  - 🎁 "A gift for someone" — "I'll make a cookbook to give away"
  - 📖 "My own cookbook" — "I'm building my personal recipe collection"
- Selection creates the first cookbook with an appropriate default title

**Step 6 — Palette picker**
- Headline: "Pick your style" (Caveat)
- 4 palette swatches full-width (Terracotta · Sage · Blush · Cobalt), each shows a mini
  preview of what the app looks like in that palette
- Can be changed later in Settings

**Step 7 — Sign up / Sign in**
- Shown last — user already sees value before being asked to commit
- Email + magic link (no password, lower friction)
- "Or continue with Apple" (required for App Store)
- "Or continue with Google"
- First cookbook from step 5 is created immediately after auth

Acceptance criteria:
- [ ] Onboarding never shows again after completion (MMKV flag `onboarding_complete`)
- [ ] Skipping sign up is NOT possible — auth required to save data
- [ ] Intent from step 5 pre-fills first cookbook title: "A gift for [name]" or "[Your name]'s Cookbook"
- [ ] Palette from step 6 saved to `users.palette` on account creation
- [ ] "Continue with Apple" sign-in is functional (required for App Store approval)
- [ ] Deep linking into the app bypasses onboarding if already authenticated

---

### 18 · Tablet / Web Editor
**Route:** Same routes, layout adapts at breakpoint 768px+

Layout:
- Left sidebar (70px): app logo + tool icons (Layout · Stickers · Images · Text · Brush)
- Center canvas (fills remaining, min 500px): full recipe canvas
- Right panel (220px): contextual panel for active tool (sticker grid, layer panel, etc.)
- Top bar: page name · Preview · Save

Acceptance criteria:
- [ ] Responsive breakpoint at 768px width
- [ ] Right panel collapses to bottom sheet on phone
- [ ] Sticker grid in right panel is 3-col with category filters

---

## Database schema

> **The production-ready schema is in `BACKEND.md` § "Database Entities & Relationships".**
> That version adds: `update_updated_at()` trigger on every table, recipe/cookbook count triggers,
> `pg_trgm` full-text search index on recipe titles, corrected FK references (`public.` prefix),
> RLS policies for every table, and additional columns (`paper_texture`, `language`, `push_token`,
> `revenuecat_id`, `recipes_count`, `cookbooks_count` on users; `intent`, `recipient_name` on cookbooks;
> `cover_image_url`, corrected `source_type` values on recipes; `storage_path`, `width`, `height` on user_images;
> `gift_message`, `paid_at`, `shipped_at`, `lulu_status_raw` on print_orders).
> Use `BACKEND.md` as the authoritative schema when writing migrations.
> The abbreviated version below is kept for quick reference only.

```sql
-- ─────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────
create table users (
  id               uuid primary key default gen_random_uuid(),
  email            text unique not null,
  username         text unique,
  avatar_url       text,
  tier             text not null default 'free' check (tier in ('free','premium')),
  palette          text not null default 'terracotta'
                     check (palette in ('terracotta','sage','blush','cobalt')),
  telegram_id      bigint unique,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- COOKBOOKS
-- ─────────────────────────────────────────────────────────────
create table cookbooks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  title            text not null,
  description      text,
  cover_url        text,
  palette          text not null default 'terracotta'
                     check (palette in ('terracotta','sage','blush','cobalt')),
  is_public        boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index on cookbooks(user_id);

-- ─────────────────────────────────────────────────────────────
-- RECIPES
-- ─────────────────────────────────────────────────────────────
create table recipes (
  id               uuid primary key default gen_random_uuid(),
  cookbook_id      uuid references cookbooks(id) on delete set null,
  user_id          uuid not null references users(id) on delete cascade,
  title            text not null,
  description      text,
  source_url       text,
  source_type      text not null default 'manual'
                     check (source_type in ('manual','telegram_link','telegram_image','link_import','ai')),
  ingredients      jsonb not null default '[]', -- [{name, amount, unit}]
  instructions     jsonb not null default '[]', -- [{step, text, image_url?}]
  servings         integer,
  prep_minutes     integer,
  cook_minutes     integer,
  tags             text[] not null default '{}',
  is_favorite      boolean not null default false,
  position         integer not null default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index on recipes(user_id);
create index on recipes(cookbook_id);

-- ─────────────────────────────────────────────────────────────
-- CANVAS (one per recipe page)
-- ─────────────────────────────────────────────────────────────
create table recipe_canvases (
  id                    uuid primary key default gen_random_uuid(),
  recipe_id             uuid unique references recipes(id) on delete cascade,
  user_id               uuid not null references users(id) on delete cascade,
  width                 integer not null default 794,  -- A4 at 96dpi
  height                integer not null default 1123,
  background_template   text,                          -- template key
  thumbnail_url         text,                          -- PNG snapshot
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Stickers, text blocks, photos, washi tape on a canvas
create table canvas_elements (
  id               uuid primary key default gen_random_uuid(),
  canvas_id        uuid not null references recipe_canvases(id) on delete cascade,
  element_type     text not null
                     check (element_type in ('sticker','text','user_image','washi_tape')),
  sticker_key      text,          -- key into built-in stickerDefs (e.g. 'tomato')
  user_image_id    uuid references user_images(id) on delete set null,
  pos_x            float not null default 0,
  pos_y            float not null default 0,
  rotation         float not null default 0,
  scale_x          float not null default 1,
  scale_y          float not null default 1,
  z_index          integer not null default 0,
  text_content     text,
  text_style       jsonb,  -- {fontFamily, fontSize, color, align}
  washi_style      jsonb,  -- {color, pattern, width, rotation}
  created_at       timestamptz default now()
);
create index on canvas_elements(canvas_id);

-- Drawing layers on a canvas
create table drawing_layers (
  id               uuid primary key default gen_random_uuid(),
  canvas_id        uuid not null references recipe_canvases(id) on delete cascade,
  name             text not null default 'Layer',
  position         integer not null default 0,  -- higher = on top
  opacity          float not null default 1.0 check (opacity between 0 and 1),
  blend_mode       text not null default 'normal'
                     check (blend_mode in ('normal','multiply','overlay','screen','soft-light')),
  visible          boolean not null default true,
  created_at       timestamptz default now()
);
create index on drawing_layers(canvas_id);

-- Individual strokes within a drawing layer
create table drawing_strokes (
  id               uuid primary key default gen_random_uuid(),
  layer_id         uuid not null references drawing_layers(id) on delete cascade,
  points           jsonb not null,  -- [{x, y, pressure}]
  stroke_width     float not null default 4,
  color            text not null default '#3b2a1f',
  opacity          float not null default 1.0,
  smoothed_path    text,            -- cached SVG path string from perfect-freehand
  created_at       timestamptz default now()
);
create index on drawing_strokes(layer_id);

-- ─────────────────────────────────────────────────────────────
-- STICKERS
-- ─────────────────────────────────────────────────────────────
-- Built-in stickers are keyed by name (no DB row needed).
-- This table is for user-uploaded custom stickers only.
create table user_images (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  url              text not null,
  thumb_url        text,
  file_size        integer,
  mime_type        text,
  is_sticker       boolean not null default false,
  created_at       timestamptz default now()
);
create index on user_images(user_id);

-- ─────────────────────────────────────────────────────────────
-- BOOK PAGES
-- ─────────────────────────────────────────────────────────────
create table book_pages (
  id               uuid primary key default gen_random_uuid(),
  cookbook_id      uuid not null references cookbooks(id) on delete cascade,
  page_type        text not null
                     check (page_type in (
                       'cover','dedication','about','chapter_divider',
                       'recipe','blank','toc','closing'
                     )),
  recipe_id        uuid references recipes(id) on delete cascade,  -- only for recipe pages
  canvas_id        uuid references recipe_canvases(id),             -- decorated canvas
  template_key     text,           -- page template identifier
  title            text,           -- for chapter dividers
  position         integer not null default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index on book_pages(cookbook_id);

-- ─────────────────────────────────────────────────────────────
-- PDF EXPORTS
-- ─────────────────────────────────────────────────────────────
create table pdf_exports (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  cookbook_id      uuid references cookbooks(id) on delete set null,
  recipe_ids       uuid[],
  pdf_url          text,
  style            text not null default 'scrapbook'
                     check (style in ('scrapbook','clean')),
  paper_size       text not null default 'a5'
                     check (paper_size in ('a4','a5')),
  status           text not null default 'pending'
                     check (status in ('pending','processing','ready','failed')),
  expires_at       timestamptz default (now() + interval '7 days'),
  created_at       timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- PRINT ORDERS (Lulu xPress)
-- ─────────────────────────────────────────────────────────────
create table print_orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  cookbook_id        uuid references cookbooks(id) on delete set null,
  pdf_export_id      uuid references pdf_exports(id),
  lulu_order_id      text unique,
  recipient_name     text not null,
  recipient_email    text,
  shipping_address   jsonb not null,  -- {line1, line2, city, state, postal_code, country}
  format             text not null default 'a5_softcover'
                       check (format in ('a5_softcover','a5_hardcover','a4_hardcover')),
  page_count         integer,
  price_cents        integer,
  currency           text not null default 'USD',
  status             text not null default 'pending'
                       check (status in ('pending','submitted','printing','shipped','delivered','failed')),
  tracking_url       text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- TELEGRAM
-- ─────────────────────────────────────────────────────────────
create table telegram_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique not null references users(id) on delete cascade,
  telegram_id      bigint unique not null,
  username         text,
  connected_at     timestamptz default now()
);

create table telegram_jobs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  telegram_id      bigint not null,
  input_type       text not null check (input_type in ('link','screenshot','text')),
  raw_url          text,
  image_url        text,   -- uploaded to Supabase Storage
  raw_text         text,
  status           text not null default 'pending'
                     check (status in ('pending','processing','done','failed')),
  recipe_id        uuid references recipes(id),
  error_msg        text,
  created_at       timestamptz default now(),
  processed_at     timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- AI JOBS
-- ─────────────────────────────────────────────────────────────
create table ai_jobs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  job_type         text not null
                     check (job_type in ('recipe_extract','auto_sticker','image_to_recipe')),
  input_data       jsonb not null,
  output_data      jsonb,
  status           text not null default 'pending'
                     check (status in ('pending','processing','done','failed')),
  tokens_used      integer,
  model            text not null default 'claude-haiku-4-5-20251001',
  created_at       timestamptz default now(),
  completed_at     timestamptz
);
```

### Row Level Security (all tables)
Every table has RLS enabled. Default policy: `user_id = auth.uid()`.
Cookbooks with `is_public = true` are readable by all authenticated users.
`telegram_jobs` and `ai_jobs` writable only by service role (bot/Edge Functions).

> Full RLS policy SQL (create policy statements for all 14 tables) is in `BACKEND.md` § "Row Level Security".
> Storage bucket policies are also in `BACKEND.md` § "File Upload Handling".

---

## AI features

### Claude Haiku model
Use `claude-haiku-4-5-20251001`. It is fast and cheap — ideal for recipe extraction
and sticker matching. Do NOT use Sonnet or Opus for these tasks (cost vs. value).
Always enable prompt caching on system prompts (they are identical across calls).

### Recipe extraction prompt pattern
```typescript
// system prompt (cache this — it never changes, cache_control: ephemeral)
const EXTRACTION_SYSTEM = `You are a recipe extraction assistant.
Given a URL, scraped HTML, or image, extract the recipe as structured JSON.
Return exactly: { title, description, ingredients: [{name, amount, unit}],
instructions: [{step, text}], servings, prep_minutes, cook_minutes, tags }
Respond in the same language as the recipe content.
If the user's locale is 'uk', translate field labels to Ukrainian but keep
ingredient/step text in its original language unless it is already Ukrainian.`

// user prompt includes the content + user locale
const userPrompt = `Locale: ${userLocale}\nContent: ${scrapedContent}`
```

### i18n — English + Ukrainian

```
src/i18n/
  en.json    — all UI strings in English
  uk.json    — all UI strings in Ukrainian
```

Setup:
```typescript
import * as Localization from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

i18n.use(initReactI18next).init({
  lng: Localization.locale.startsWith('uk') ? 'uk' : 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en }, uk: { translation: uk } },
})
```

User can override detected language in Settings.
Chosen fonts (Nunito, Fraunces, Caveat) all support Cyrillic/Ukrainian via
Google Fonts — no font swap needed.
Telegram bot reads `telegram_connections.language` (set on connect) and
responds in the user's language.
Claude Haiku responses use the user's locale passed in the prompt.

### Auto-sticker ("Make me Sketch") logic
```typescript
// 1. Send recipe title + ingredients to Haiku
// 2. Haiku returns [{stickerKey, x, y, rotation, scale, reasoning}]
// 3. Apply as canvas_elements with element_type='sticker'

// Built-in sticker keys and their AI keywords:
const STICKER_AI_KEYWORDS = {
  tomato:     ['tomato','sauce','pasta','bruschetta','salad','marinara'],
  basil:      ['basil','pesto','italian','herb','margherita'],
  lemon:      ['lemon','citrus','cake','tart','zest','limoncello'],
  garlic:     ['garlic','aioli','roasted','butter','bread'],
  whisk:      ['baking','cake','batter','egg','cream','whip'],
  spoon:      ['soup','stew','sauce','stir','simmer'],
  wheat:      ['bread','pasta','flour','dough','grain'],
  strawberry: ['strawberry','jam','shortcake','berry','dessert'],
  flower:     ['floral','elderflower','lavender','rose','garnish'],
  leaf:       ['salad','herb','green','fresh','vegetarian'],
  heart:      ['favourite','family','grandma','love','special'],
  mushroom:   ['mushroom','risotto','forager','earthy','umami'],
  bread:      ['bread','sourdough','focaccia','loaf','baking'],
  cherry:     ['cherry','pie','dessert','clafoutis','sweet'],
  pan:        ['fry','sauté','skillet','steak','pancake'],
  star:       ['special','holiday','christmas','celebration','award'],
}
```

---

## Telegram bot

Deployed on Railway (Node.js service, always-on).

```
User sends link/screenshot to @SpoonAndSketchBot
→ Bot receives webhook (Telegraf)
→ Creates telegram_jobs row (status: pending)
→ Pushes job to BullMQ queue
→ Worker pulls job, calls Claude Haiku
→ Creates recipe in DB via service role
→ Updates telegram_jobs (status: done, recipe_id)
→ Bot sends reply: "Saved! [Recipe Title] — Open in app →"
→ Supabase Realtime pushes to app → recipe appears instantly
```

Auth flow: User taps "Connect Telegram" in app → receives one-time token →
sends token to bot → bot POSTs to Edge Function → creates telegram_connections row.

---

## PDF generation

Supabase Edge Function (Deno runtime).

Scrapbook PDF:
1. For each recipe page in book: call makeImageSnapshot on Skia canvas → PNG
2. Assemble pages: cover thumbnail + book pages in order
3. Use Puppeteer to render HTML template embedding PNGs
4. Return PDF binary, upload to Supabase Storage, write `pdf_exports` row

Clean PDF:
1. Server-side HTML template with recipe data
2. Nunito + Fraunces fonts embedded
3. No canvas images — pure typography layout

---

## Project file structure

> **The canonical folder structure is in `ARCHITECTURE.md` § "Folder Structure".**
> It is more granular than the version below and includes: `src/api/` (pure functions per entity),
> `src/hooks/queries/` + `src/hooks/mutations/` (TanStack Query hooks separated by read/write),
> `src/lib/` (analytics, sentry, revenuecat, mmkv, pdf, deeplink helpers), `src/types/` (generated DB types),
> the full `supabase/functions/` breakdown, and the `telegram-bot/` service structure.
> The abbreviated version below is kept for navigation context only.

```
spoonsketch/
├── app/                           # Expo Router
│   ├── (tabs)/
│   │   ├── index.tsx              # 01 Welcome/Home
│   │   ├── shelves.tsx            # 07 Collections + 02a/b Library
│   │   ├── elements.tsx           # 08 My Elements
│   │   └── me.tsx                 # Profile + Telegram connect
│   ├── recipe/
│   │   ├── create.tsx             # 03 Create Recipe
│   │   └── [id].tsx               # 04a/b Detail (view toggle)
│   ├── editor/
│   │   ├── [recipeId].tsx         # 05a Canvas editor
│   │   └── [recipeId]/templates.tsx # 05b Templates
│   ├── cook/
│   │   └── [id].tsx               # 06 Cook Mode
│   ├── book/
│   │   ├── [cookbookId].tsx       # 10 Book Builder
│   │   └── [cookbookId]/print.tsx # 12 Print Order
│   └── export.tsx                 # 09 PDF Export
├── src/
│   ├── components/
│   │   ├── stickers/              # All 16 SVG sticker components (from stickerDefs)
│   │   │   ├── index.tsx          # Sticker component + ALL_STICKERS array
│   │   │   └── defs.tsx           # All SVG path definitions
│   │   ├── canvas/
│   │   │   ├── SkiaCanvas.tsx     # Main Skia canvas wrapper
│   │   │   ├── CanvasElement.tsx  # Sticker/text/image with gesture transforms
│   │   │   ├── DrawingLayer.tsx   # Single drawing layer (paths)
│   │   │   ├── DrawingStroke.tsx  # Single stroke via perfect-freehand
│   │   │   └── ContextToolbar.tsx # Replace/Size/Rotate/Layer/Delete bar
│   │   ├── ui/
│   │   │   ├── ClayButton.tsx     # Primary + secondary clay neumorphic buttons
│   │   │   ├── Tag.tsx            # Pill tag component
│   │   │   ├── Meta.tsx           # Icon + label chip (time, servings)
│   │   │   ├── TabBar.tsx         # Bottom nav with FAB
│   │   │   ├── FoodImage.tsx      # Painterly placeholder (SVG turbulence)
│   │   │   ├── WashiTape.tsx      # Decorative washi tape element
│   │   │   └── PaperGrain.tsx     # Grain overlay wrapper
│   │   ├── recipe/
│   │   │   ├── RecipeCard.tsx     # Library card (shelf + index variants)
│   │   │   ├── IngredientRow.tsx  # Editable ingredient row
│   │   │   └── StepBlock.tsx      # Numbered step block
│   │   └── book/
│   │       ├── BookPageRow.tsx    # Page row in book builder
│   │       └── PageTypePicker.tsx # Add page type modal
│   ├── theme/
│   │   ├── colors.ts              # All design tokens + palette variants
│   │   ├── fonts.ts               # Font family names
│   │   └── shadows.ts             # Shadow definitions (sm, md, lg, inner)
│   ├── stores/
│   │   ├── canvasStore.ts         # Zustand: elements, layers, selected, undo stack
│   │   └── drawingStore.ts        # Zustand: active tool, stroke settings
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client init
│   │   ├── claude.ts              # Haiku recipe extraction + auto-sticker
│   │   └── lulu.ts                # Lulu xPress API client
│   └── hooks/
│       ├── useRecipes.ts          # TanStack Query hooks for recipe CRUD
│       ├── useCanvas.ts           # Canvas load/save hooks
│       └── useRealtime.ts         # Supabase Realtime subscriptions
├── supabase/
│   ├── migrations/
│   │   ├── 001_users.sql
│   │   ├── 002_cookbooks_recipes.sql
│   │   ├── 003_canvas.sql
│   │   ├── 004_book_pages.sql
│   │   ├── 005_exports_orders.sql
│   │   └── 006_telegram_ai.sql
│   └── functions/
│       ├── generate-pdf/          # PDF generation Edge Function
│       ├── auto-sticker/          # Haiku auto-sticker Edge Function
│       └── telegram-auth/         # One-time token exchange
└── bot/                           # Separate Node.js service (Railway)
    ├── index.ts                   # Telegraf bot entry
    ├── handlers/                  # link, screenshot, text handlers
    └── worker.ts                  # BullMQ worker (Haiku processing)
```

---

## Team architecture rules

These rules apply to every developer on this project. They come from `ARCHITECTURE.md` and are repeated here so they are inescapable.

1. **Screens are thin.** A screen file imports hooks and renders components. No business logic in screen files.
2. **`src/api/` is pure.** No React imports. All functions are `async` and throw `ApiError`. Easy to test in isolation.
3. **Never put server data in Zustand.** Server data belongs to TanStack Query. Zustand is for UI state only (canvas elements, undo stack, theme, drawing tool settings).
4. **All Anthropic API calls go through Edge Functions.** The `ANTHROPIC_API_KEY` must never appear in the app bundle. No exceptions.
5. **TypeScript strict mode, always.** Run `supabase gen types` after every migration to keep DB types in sync. No `any`.
6. **One analytics call per meaningful user action.** See `AnalyticsEvent` union type in `src/lib/analytics.ts` — adding an event requires updating the type first.
7. **Error boundaries wrap every tab root and the editor.** A crash in the canvas must never crash the whole app.

---

## Analytics — north-star events

> Full event list with properties is in `USER_FLOW.md` § "Analytics Events — Full List".
> The events below are the ones that define whether the product is working.

| Event | What it means |
|---|---|
| `activation_complete` | User saved their first decorated canvas — the aha moment |
| `print_order_placed` | Core revenue + gift use case completed |
| `make_me_sketch_used { first_time: true }` | User discovered the key differentiator |
| `subscription_started` | Free → paid conversion |
| `recipe_created` | Core loop entry point |
| `canvas_saved` | Core loop completion |
| `book_built` | Full gift flow completed |

**Activation target:** `activation_complete` fires for ≥40% of users who complete sign-up, within Day 1.

---

## Phase tracker

| Phase | Name | Duration | Status | Acceptance |
|---|---|---|---|---|
| 1 | Foundation & design system | Week 1–2 | ✅ Done | All design tokens implemented, 16 stickers render, ClayButton/TabBar/FoodImage work on iOS+Web |
| 2 | Auth + Supabase + recipe CRUD | Week 3–4 | ✅ Done | Sign up/in, create recipe, list recipes, upload cover photo |
| 3 | Library + detail screens | Week 5 | ✅ Done | Shelf view, index view, detail scrapbook, detail clean all render with real data |
| 4 | Canvas editor (stickers + elements) | Week 6–7 | ✅ Done | Drag sticker onto canvas, move/rotate/scale, save snapshot, templates picker |
| 4.5a | Recipe page templates | — | ✅ Done | 6 layouts (Classic, Photo Hero, Minimal, Two-Column, Journal, Recipe Card), layout tab in editor, template persists per recipe, ScrapbookView matches editor |
| 4.5b | Handwriting font picker | — | ✅ Done | 4 OFL fonts with Cyrillic support (Caveat, Marck Script, Bad Script, Amatic SC), font picker in Layout tab, persists per recipe |
| 4.5c | Draggable recipe blocks | — | ✅ Done | All 6 templates use absolute-positioned BlockElements; blocks are drag/rotate/scale/delete-able; positions persist per recipe; "Arrange Blocks" toggle + Reset in Layout tab; template change requires confirmation if overrides exist |
| 5 | Drawing + layers | Week 8–9 | ✅ Done | Freehand drawing, eraser with layer isolation, 3 layers, blend modes, undo/redo |
| 6 | Book builder | Week 10–11 | ✅ Done | All page types, drag reorder, cookbook CRUD, swipe edit/delete, recipe page → editor → back |
| 7 | AI: auto-sticker + recipe import | Week 12 | ⬜ Not started | "Make me Sketch" places ≥3 relevant stickers, link import extracts recipe |
| 8 | Telegram bot | Week 13 | ⬜ Not started | Send link to bot → recipe appears in app within 30s |
| 9 | PDF export + print order | Week 14–15 | ⬜ Not started | Generate scrapbook PDF, clean PDF, Lulu order placed and tracked |
| 10 | Cook mode + polish | Week 16 | ⬜ Not started | Cook mode with screen-on, step checklist, all 4 palettes applied throughout |
| 10.5 | Editor UX polish | Week 16 | ⬜ Not started | Help overlay, custom colour picker, drawing colours expanded; see details below |
| 11 | Testing + launch prep | Week 17–18 | ⬜ Not started | North-star test passes under 20 minutes, no crashes on iOS + Web |

Status legend: ⬜ Not started · 🔄 In progress · ✅ Done · 🚧 Blocked

---

## Phase 10.5 — Editor UX polish (deferred)

Items intentionally skipped during Phase 5 to keep scope tight. Implement before launch.

### Help overlay (`?` button in editor)
- Button is already placed in the mode-tabs row (`app/editor/[recipeId].tsx`) with a `// TODO` comment
- On tap: open a bottom sheet with short contextual sections per mode
- **Stickers section:** tap to place, drag to move, pinch to resize/rotate, tap selected to delete
- **Drawing section:** layer blending guide (Normal / Multiply / Screen / Overlay / Soft Light explained with 1-line descriptions), eraser tip, undo hint
- **Design:** embed short looping GIF demos per feature (record these as screen recordings before implementation)

### Drawing colour palette
- Current: 8 fixed colours from the app design system
- Desired: expand to ~16 colours + a custom colour picker (hue/saturation wheel or grid)
- Colour picker library candidates: `react-native-wheel-color-picker`, or a custom Skia-drawn wheel

### Other polish items
- Per-recipe drawing persistence: current store holds only one recipe's drawing at a time; migrate to MMKV keyed by `recipeId` so switching between recipes doesn't lose work
- Apple Pencil pressure: wire `e.pressure` from the gesture event into `StrokePoint.pressure` for natural thinning (currently simulated at 0.5)

---

## Current state — handoff notes (updated 2026-04-20, Phase 4.5c added)

> **New Claude instance: read this before touching any code.**
> This section is the authoritative record of what was built and what is blocked.

### What is done

**Phase 4.5c — Draggable recipe blocks (added 2026-04-20):**

All 6 recipe page templates now use absolute-positioned `BlockElement` wrappers instead of flex layout. Each block can be selected, moved (pan), rotated (rotation handle or two-finger), scaled (pinch or scale handle), and deleted (soft-hide, restored via Reset).

New files:
| File | What it does |
|---|---|
| `src/lib/blockDefs.ts` | `BlockDef`, `BlockOverride`, `BlockAbsoluteLayout` types + `TEMPLATE_BLOCKS` registry — 6 templates × 3–5 blocks each with `getDefault(pw)` functions |
| `src/components/canvas/BlockElement.tsx` | Gesture wrapper for arbitrary children. `editMode=false` → static `View` (no Reanimated). `editMode=true` → full pan/rotation/pinch + ↻ and □ handles + × delete button. Mirrors `CanvasElement` callback-ref + stable-wrapper pattern. |

Files modified:
- `src/lib/canvasStore.ts` — added `blockOverrides` (MMKV-persisted), `layoutResetVersion`, `setBlockOverride`, `removeBlock`, `clearBlockOverrides`; `setTemplateKey` shows Alert confirmation before clearing overrides
- `src/components/canvas/PageTemplates.tsx` — all templates converted to absolute BlockElement layout; `TemplateProps` extended with optional block-editing props; `useBlockResolver` helper resolves overrides + defaults; `makeBlockProps` reduces per-template boilerplate
- `app/editor/[recipeId].tsx` — "Arrange Blocks" toggle in Layout panel; `blockEditMode` + `selectedBlockId` local state; stickers disabled while in block-edit mode; panelHeight → 264 for layout mode
- `app/recipe/[id].tsx` — `blockOverrides` from store passed to `PageTemplate` in ScrapbookView

Coordinates: stored as fractions of `pageWidth`/`pageHeight` (device-independent). `layoutResetVersion` increments on reset → forces BlockElement key-based remount (clears stale Reanimated shared values). Deleted blocks stored with `hidden: true` in `blockOverrides`; restored via "Reset" button.

---

**Phase 4.5b — Handwriting font picker (added 2026-04-20):**

4 handwritten Google Fonts (all SIL OFL, all Cyrillic-supporting) selectable in the Layout tab below the template picker. Font choice persists per-recipe in canvasStore (MMKV). Fonts: Caveat (existing), Marck Script, Bad Script, Amatic SC.

New files:
| File | What it does |
|---|---|
| `src/components/canvas/FontPicker.tsx` | Horizontal scroll picker; each item shows "Recipe" in that font inside a bordered card |

Files modified:
- `src/lib/canvasStore.ts` — `FontPresetKey` type, `recipeFont` state, `setRecipeFont`, persisted
- `src/components/canvas/PageTemplates.tsx` — `FontPreset`/`FONT_PRESETS`/`resolvePreset`; `TemplateProps` extended; inline `fontFamily` overrides on title + all hand-text; `Steps`/`Tags` accept font string props
- `app/_layout.tsx` — 4 new font variants loaded in `useFonts()`
- `app/editor/[recipeId].tsx` — `FontPicker` below `TemplatePicker` in Layout mode; layout panel height → 220; `recipeFont` passed to `PageTemplate`
- `app/recipe/[id].tsx` — `recipeFont` from store passed to `PageTemplate`

---

**Phase 4.5a — Recipe page templates (added 2026-04-20):**

6 recipe layout templates implemented. Users choose a template via the `⊞ Layout` tab in the canvas editor; choice persists per recipe and is reflected in the Scrapbook view.

New files:
| File | What it does |
|---|---|
| `src/components/canvas/PageTemplates.tsx` | `PageTemplate` switch component; 6 layouts (Classic, PhotoHero, Minimal, TwoColumn, Journal, RecipeCard); `TEMPLATES` metadata array for picker |
| `src/components/canvas/TemplatePicker.tsx` | Horizontal scroll picker with coloured box diagrams and labels |

Files modified:
- `src/lib/canvasStore.ts` — added `TemplateKey` type, `templateKey` state (default `'classic'`), `setTemplateKey` action, persisted to MMKV
- `app/editor/[recipeId].tsx` — removed old inline `PageBase`; added `layout` editor mode + `⊞ Layout` tab; panel renders `<TemplatePicker>`; canvas renders `<PageTemplate>`
- `app/recipe/[id].tsx` — `ScrapbookView` now renders `<PageTemplate>` instead of hardcoded layout; preview always matches editor choice

---

**Phase 5 code is fully written and TypeScript-clean.**
All 7 new files exist on disk:

| File | What it does |
|---|---|
| `src/types/drawing.ts` | `StrokePoint`, `DrawingStroke`, `DrawingLayer`, `BlendMode` types |
| `src/lib/drawingStore.ts` | Zustand store: 3 default layers, active layer, tool, width/color/opacity, undo stack, persist |
| `src/components/canvas/SkiaCanvas.tsx` | Skia `<Canvas>` with gesture-driven live stroke + committed layers; `isDrawing=false` → `pointerEvents="none"` |
| `src/components/canvas/DrawingLayer.tsx` | Skia `<Group opacity blendMode>` wrapping committed + live strokes |
| `src/components/canvas/DrawingStroke.tsx` | `perfect-freehand` → Skia Path fill; handles pressure thinning |
| `src/components/canvas/DrawingToolbar.tsx` | Brush/eraser, 8 color swatches, step-sliders for width+opacity, Layers button |
| `src/components/canvas/LayerPanel.tsx` | Bottom sheet (spring animation), visibility, blend mode, opacity, ↑↓ reorder, delete |

Files modified in Phase 5:
- `app/editor/[recipeId].tsx` — mode tabs (Stickers / Draw), SkiaCanvas integration, LayerPanel, `initDrawing`, undo routing by mode
- `src/components/canvas/CanvasElement.tsx` — `disabled` prop + gesture stability overhaul (see below)

**CanvasElement gesture stability fix (Phase 4 bug, fixed in Phase 5 session):**
Pinch/rotate gestures were silently broken on device.
Root cause: `useMemo` deps contained arrow function props → recreated mid-gesture when `scrollEnabled` changed → gesture reset.
Fix: all callbacks stored in `useRef`, wrapped in `useCallback(fn, [])` stable wrappers, all gesture `useMemo` have `[]` deps.
Also added explicit single-finger handles: rotation (↻, top-center drag) and scale (□, bottom-right drag) — far more reliable on small targets than two-finger pinch.

**Dev build is set up:**
- Xcode 16.3 installed at `/Applications/Xcode.app`
- `xcode-select` configured: `/Applications/Xcode.app/Contents/Developer`
- iOS Simulator runs via `npx expo run:ios`
- `@shopify/react-native-skia` and `perfect-freehand` need to be installed before first build:
  ```bash
  npx expo install @shopify/react-native-skia
  npm install perfect-freehand
  npx expo run:ios
  ```

### What is blocked

**Phase 5 is code-complete but untested.**

Blocker: sign-in fails in the iOS Simulator. When the user taps the sign-in button, an error is shown (exact message unknown — screenshot taken but not transcribed). The error prevents reaching any authenticated screen, so Phase 5 drawing features cannot be reached or verified.

Secondary symptom: "Network request failed" errors appear in Metro logs for Supabase API calls. The Supabase project is confirmed alive. Root cause may be Simulator network sandbox restrictions, or a sign-in configuration issue.

**What to do next (for next Claude instance):**
1. Investigate and fix the sign-in error in the Simulator (check `src/api/auth.ts`, Supabase URL/anon key in `.env`, Expo dev client network settings)
2. Once sign-in works: run Phase 5 verification checklist (listed in the snappy-percolating-hellman plan file at `~/.claude-personal/plans/snappy-percolating-hellman.md`)
3. If all 11 verification steps pass → mark Phase 5 ✅ Done in this file
4. Commit all Phase 5 files + editor changes

### Files to verify exist before testing

```
src/types/drawing.ts
src/lib/drawingStore.ts
src/components/canvas/SkiaCanvas.tsx
src/components/canvas/DrawingLayer.tsx
src/components/canvas/DrawingStroke.tsx
src/components/canvas/DrawingToolbar.tsx
src/components/canvas/LayerPanel.tsx
```

---

## North-star test

> Before marking the project launch-ready, run this exact flow and time it.
> It must complete in under 20 minutes and the result must be something
> you are proud to give as a gift.

1. Sign up with a new account
2. Send 3 recipe links to the Telegram bot
3. Wait for recipes to appear in app
4. Tap "Make me Sketch" on each recipe
5. Open Book Builder → add cover + dedication page
6. Write a 2-line dedication with Apple Pencil (or mouse on web)
7. Pick a palette theme
8. Export full book PDF (Scrapbook style)
9. Place a print order (Lulu xPress, A5 softcover)

If the result looks beautiful and the flow feels natural: ship it.
If any step causes friction or the output looks cheap: fix before shipping.

---

## What is NOT in v1 (do not build)

- Android — build after iOS + Web validated
- Family / co-editing shared cookbooks
- Template marketplace (designers sell templates)
- User-submitted sticker packs + moderation pipeline
- Social sharing / public cookbook discovery
- Safari share extension (Telegram bot covers import in v1)
- Multiple languages in the bot (English only in v1)
- Subscription billing (validate pricing model first)
- Offline-first sync (Supabase Realtime + cache is sufficient for v1)

---

## Open questions

| # | Question | Status | Decision |
|---|---|---|---|
| 1 | **Business model** — free / freemium / paid upfront? | ✅ Decided | **Freemium.** Free tier has limits (3 cookbooks, 30 recipes, 5 AI uses/month, watermarked PDF). Premium ~$5–8/mo or ~$40/yr unlocks unlimited everything. RevenueCat handles IAP + web. Full tier table in the Monetization section above. |
| 2 | **Family sharing** — co-editing a cookbook? | ⬜ Deferred | Defer to v2. Adds real-time conflict resolution (CRDTs). Private cookbooks only in v1. |
| 3 | **Offline editing** — canvas on a plane? | ⬜ Deferred | MMKV cache + Supabase Realtime is sufficient for v1. Full offline (SQLite + sync) is a separate architecture track. |
| 4 | **Platform rollout** — iOS + Web day 1, or iOS first? | ⬜ Open | Expo supports both. Recommendation: ship iOS + Web simultaneously (same build). Android after validation. |
| 5 | **Sticker IP** — original SVGs or need to commission? | ⬜ Open | Prototype SVGs are fine for development. Need IP clearance before App Store submission. Commission originals if prototype SVGs have any third-party lineage. |
