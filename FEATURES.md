# Spoon & Sketch — Features

A source-of-truth description of the app as it exists today. Written for product, QA, and design: use it to draft acceptance criteria, user stories, and test scripts. Describes what the user can actually do on screen; does not describe database tables, SQL, or file paths.

---

## How to read this doc

- **Organized by user-facing area.** One top-level section per tab, route, modal, or app-wide concern. Headings follow what a user sees and says, not what the code file is called.
- **Each feature section follows a fixed shape.** When a field does not apply, the row is kept with `—` so readers can tell "not applicable" from "forgot to write it":
  - **Full page** — route, toolbar, layout, filters
  - **Widget** (when the feature appears as a card inside a larger screen) — states: *loaded*, *empty*, *loading*, *error*, and where tapping it leads
  - **Forms** — one table per form with columns: `Field | Type | Required | Default | Options / Constraints | Custom allowed | Notes`
  - **Actions** — per-item actions and the confirmation they require
  - **Realtime** — does this section subscribe to live server changes? (yes / no + which data)
  - **Permissions** — role or tier gate, if any
  - **Limits** — per-entity caps
- **UI vocabulary only.** Labels, button text, and placeholder text are quoted exactly as they appear on screen. Internal identifiers (enum keys) are shown only where the user will see them referenced (never as the only label).
- **Integrations section lists what is wired vs. not wired** so the doc stays honest about what works end-to-end today.
- **Limits and enum values** live in appendices to keep the main sections readable.

If you need release timing or historical "why" context, read `PLAN.md` or the project's bug log — this document is intentionally stateless.

---

## Table of contents

1. [Global & app-wide](#1-global--app-wide)
2. [Auth](#2-auth)
3. [Home tab](#3-home-tab)
4. [Shelves tab](#4-shelves-tab)
5. [Add tab](#5-add-tab)
6. [Elements tab](#6-elements-tab)
7. [Me tab](#7-me-tab)
8. [Recipe create](#8-recipe-create)
9. [Recipe detail](#9-recipe-detail)
10. [Recipe editor](#10-recipe-editor)
11. [Book Builder](#11-book-builder)
12. [Non-recipe book page stubs](#12-non-recipe-book-page-stubs)
13. [Integrations](#13-integrations)
14. [Appendix A — Entity limits](#appendix-a--entity-limits)
15. [Appendix B — Enum values](#appendix-b--enum-values)

---

## 1. Global & app-wide

### 1.1 Palettes

Four colour themes ship with the app. Each palette defines a background, secondary background, paper, and three accent shades. Used both as app-wide theme tokens and as the per-cookbook colour identity.

| Palette | Background | Accent |
|---|---|---|
| Terracotta (default) | `#f4ecdc` | `#c46a4c` |
| Sage | `#eef0e4` | `#6f8a52` |
| Blush | `#f5e7e1` | `#c66a78` |
| Cobalt | `#e8e5dc` | `#2f5c8f` |

- **Where it applies today:** tab bar, Home, Shelves, recipe create, recipe detail, editor chrome, book builder — every screen reads from the active palette.
- **Cookbook palette picker** exists inside the Shelves "New / Edit cookbook" modal (see §4.2). The cookbook's palette is stored on the cookbook row but does not yet re-theme the app chrome when that cookbook is opened — the app-wide theme stays at its current value.
- **Limits:** user cannot pick a custom hex; the four presets are the only options.

### 1.2 Fonts

Three display/UI fonts plus four user-selectable handwriting fonts.

| Font | Used for |
|---|---|
| Fraunces (Regular / Bold) | Display headings, page titles |
| Caveat (Regular / Bold) | Handwritten-style microcopy and recipe titles |
| Nunito (Regular / SemiBold / Bold) | Body, buttons, form controls |

Handwriting fonts (selectable per recipe or as a cookbook default): **Caveat**, **Marck Script**, **Bad Script**, **Amatic SC**.

All seven fonts are bundled via Expo's Google Fonts packages and support Cyrillic where the source font does (Caveat, Nunito, Fraunces).

### 1.3 Locale

English only. No language picker, no i18n runtime, no `expo-localization`. Ukrainian is planned per project docs but not wired in the client. User-entered text (section titles, recipe content) is stored verbatim — users can type any language, the UI chrome stays English.

### 1.4 Persistent client state

Three client stores persist to device storage (SecureStore on native, localStorage on web). **No server data lives in these stores** — they are UI-only.

| Store | Persists? | What it holds |
|---|---|---|
| **Theme** | No | Active palette name + resolved palette object. Defaults to Terracotta on every launch. |
| **Canvas** | Yes | Per-recipe: canvas elements (stickers), selection, selected template key, selected handwriting font, block overrides (position / size / font scale / hidden), step + ingredient text overrides, undo history (max 50 snapshots). |
| **Drawing** | Yes | Per-recipe: layers (max 5), active layer, active tool (brush / eraser), stroke width, colour, opacity, layer undo history. |

Server state (recipes, cookbooks, book pages, recipe canvases) is owned by TanStack Query. The store shapes above are never used as a cache — they track UI-only drafts and undoable edits.

### 1.5 Error boundaries

Every tab root and every full-screen route is wrapped in an error boundary. A render-time crash on one screen shows a recovery fallback; it does not white-screen the app.

Protected screens: Home, Shelves, Elements, Me, Book Builder, Recipe Create, Recipe Detail, Recipe Editor.

The Add tab is a redirect stub, so it intentionally has no boundary.

### 1.6 Auth gate and session storage

- On launch, a gate checks for an active session. No session → redirect to `/(auth)/login`. Session present while on the auth screen → redirect to Home.
- Sessions are stored in the iOS keychain (via `expo-secure-store`) on native, and in `localStorage` on web.
- Supabase auto-refresh is tied to the iOS `AppState` — it runs only while the app is in the `active` foreground state, which prevents a keychain crash when the device is locked or the app is backgrounded.

### 1.7 Limits & constraints (summary)

See Appendix A for the full list. Highlights:

- Password ≥ 6 characters
- Cookbook section titles ≤ 40 characters each
- Drawing layers ≤ 5 per recipe
- Canvas undo history ≤ 50 snapshots
- Cookbook cover + table-of-contents pages: ≤ 1 of each per cookbook

### 1.8 Realtime

None. The app does not subscribe to server-push changes on any table. Data is pulled on screen focus and on pull-to-refresh; mutations trigger targeted cache invalidations.

---

## 2. Auth

### 2.1 Full page — Sign in / Create account

- **Route:** `/(auth)/login`
- **Layout:** single column, two-tab header — *Sign In* and *Create Account* — switches the form variant. Form presented on the paper-toned background.
- **Only reachable when signed out.** Once a session exists, the auth gate redirects away.

### 2.2 Form — Sign in

| Field | Type | Required | Default | Options / Constraints | Custom allowed | Notes |
|---|---|---|---|---|---|---|
| Email | email | Yes | — | Valid email format (validated by Supabase on submit) | — | email keyboard, no autocapitalize, no autocorrect |
| Password | password | Yes | — | ≥ 6 characters | — | masked input (`secureTextEntry`) |

**Submit:** "Sign in" button. Double-submit is guarded (button shows a spinner and is disabled while the request is in flight).

### 2.3 Form — Create account

| Field | Type | Required | Default | Options / Constraints | Custom allowed | Notes |
|---|---|---|---|---|---|---|
| Email | email | Yes | — | Valid email format | — | same keyboard options as Sign in |
| Password | password | Yes | — | ≥ 6 characters | — | masked |
| Confirm password | password | Yes | — | Must match Password | — | masked |

**Submit:** "Create account" button. On success an alert reads "Check your email to confirm" and the form switches back to the Sign in tab. Email confirmation is handled by Supabase — the user clicks the link in their inbox, which does not return them into the app (no deep link flow yet).

### 2.4 Actions

- **Sign out** lives on the Me tab (see §7). Guarded against double-submit.

### 2.5 Not implemented

- Password reset / forgot-password flow
- Magic-link sign-in
- "Sign in with Apple"
- "Sign in with Google"
- In-app email confirmation (deep linking back from confirmation email)

### 2.6 Realtime / Permissions / Limits

- **Realtime:** —
- **Permissions:** unauthenticated users can only reach the auth screen; everything else is gated
- **Limits:** password ≥ 6 characters

---

## 3. Home tab

### 3.1 Full page

- **Route:** `/(tabs)` (index)
- **Header:** 280px hero image with soft overlay. Greeting adapts to the time of day — "good morning", "good afternoon", or "good evening" — followed by the user's first name. Title reads **"My Cookbook"**.
- **Layout:** vertical scroll. Hero, then a "Today's pick" card, then an "All recipes" list. Pull-to-refresh refetches the recipe list.

### 3.2 Widget — Today's pick

A single card featuring the first recipe in the user's collection.

| State | What the user sees |
|---|---|
| Loaded (≥ 1 recipe) | Card with the recipe's cover image, title, and a short description. Taps → Recipe detail. |
| Empty | Widget is omitted (the "Your cookbook is ready" empty state takes over the screen instead — see §3.4). |
| Loading | No skeleton; spinner sits inline above the list. |
| Error | Widget is omitted; the error state takes over the screen. |

### 3.3 Widget — All recipes

| State | What the user sees |
|---|---|
| Loaded | "All recipes" heading with a count, followed by a vertical list of recipe rows. Taps → Recipe detail. |
| Empty | Whole screen becomes an empty state: whisk sticker, heading "Your cookbook is ready", and a "+ Add a recipe" button → Recipe create. |
| Loading | Spinner in the body region. |
| Error | Whole screen becomes an error state: whisk sticker, heading "Couldn't load recipes", and a "Retry now" button. |

### 3.4 Actions

- Tap recipe row / Today's pick → Recipe detail
- "+ Add a recipe" (empty state) → Recipe create
- "Retry now" (error state) → refetches
- Pull-to-refresh → refetches the recipe list

### 3.5 Realtime / Permissions / Limits

- **Realtime:** —
- **Permissions:** signed-in users only
- **Limits:** —

---

## 4. Shelves tab

### 4.1 Full page

- **Route:** `/(tabs)/shelves`
- **Header:** eyebrow "my kitchen", title "My Books", and a "+ New" button on the right that opens the Cookbook form modal in create mode.
- **Layout:** a single scrollable page. An "📖 All Recipes" collapsible row sits above the cookbook list.

### 4.2 Modal — Cookbook form (create + edit)

Same modal in two modes. Opened from "+ New" (create) or the swipe "Edit" action (edit).

| Field | Type | Required | Default | Options / Constraints | Custom allowed | Notes |
|---|---|---|---|---|---|---|
| Title | text | Yes | — | Free text, autofocused | Yes (user types anything) | "Name it *Mum's kitchen*, *Weeknight dinners*, anything…" placeholder |
| Colour theme | picker | Yes | Terracotta (create) / current value (edit) | One of the four palette swatches | No | Tap a swatch to select; selection is visually highlighted |

Footer buttons: **Cancel** (closes, discards) and **Create** / **Save** (spinner while in flight, disabled on invalid input and while in flight).

The modal is wrapped in a keyboard-avoiding container so the title field stays visible above the iOS keyboard.

### 4.3 Widget — All Recipes

A collapsible section that shows all of the user's recipes across cookbooks.

- Tap the "📖 All Recipes" header row to expand / collapse.
- When expanded, the widget shows:
  - a search input ("Search recipes…")
  - a horizontal strip of filter pills
  - a grid-vs-list view toggle
  - the recipe rows themselves
- Tapping a recipe → Recipe detail.

**Filter pills** (tap to toggle; one active at a time, default "All"):

| Pill | Filter |
|---|---|
| All | no filter |
| Favourites | recipes marked favourite |
| Quick | recipes with the tag `quick` |
| Veg | recipes with the tag `veg` |
| Baking | recipes with the tag `baking` |
| Soups | recipes with the tag `soup` |

**View toggle** switches between a 2-column grid (recipe card thumbnails) and a single-column list (rows with title + metadata).

**States:**

| State | What the user sees |
|---|---|
| Loaded (≥ 1 recipe) | Grid or list of recipes |
| Loaded (filter yields nothing) | "No recipes match" message |
| Empty (zero recipes in account) | "No recipes yet" message, plus a "+ Create a recipe" link to Recipe create |
| Loading | Inline spinner |
| Error | Inline "Couldn't load recipes" message |

### 4.4 Widget — Cookbook list

Each cookbook renders as a shelf-like row with its palette accent.

| State | What the user sees |
|---|---|
| Loaded | Rows for each cookbook, tap → Book Builder |
| Empty | Friendly empty-state card inviting "+ New" |
| Loading | Inline spinner |
| Error | Inline error card with "Retry" |

**Row swipe actions (iOS)**

| Action | Confirmation | Effect |
|---|---|---|
| Edit (blue) | — | Opens Cookbook form modal in edit mode |
| Delete (red) | Two-step via a native confirm alert | Removes the cookbook. Guarded against double-tap; cache for cookbook detail and its pages is evicted. |

### 4.5 Actions (summary)

- "+ New" → open create modal
- Tap cookbook row → Book Builder
- Swipe-Edit → open edit modal
- Swipe-Delete → confirm → delete
- Tap "📖 All Recipes" → expand / collapse
- Tap recipe row inside All Recipes → Recipe detail

### 4.6 Realtime / Permissions / Limits

- **Realtime:** —
- **Permissions:** signed-in users only; RLS scopes all reads and writes to the current user
- **Limits:** —

---

## 5. Add tab

- **Route:** `/(tabs)/add`
- **Behaviour:** not a standalone screen. The tab bar renders a floating "+" button in this slot; tapping it opens the **Import a Recipe** modal (see section 8). The underlying `/add` route redirects to `/recipe/import` so deep links land in the same place.
- **Realtime:** —
- **Permissions:** signed-in users only
- **Limits:** —

---

## 6. Elements tab

- **Route:** `/(tabs)/elements`
- **Status:** placeholder. The screen renders the single line "Elements — coming in Phase 4" centred on the paper background.
- **Intended purpose (not yet implemented):** a browser of stickers, washi tapes, and decoration packs.
- **Realtime:** —
- **Permissions:** signed-in users only
- **Limits:** —

---

## 7. Me tab

### 7.1 Full page

- **Route:** `/(tabs)/me`
- **Status:** placeholder profile. Shows "Profile — coming soon" text and a single secondary-style "Sign out" button.
- **No account settings UI today.** There is no palette picker, no paper-texture picker, no profile editing, no tier display, and no account deletion.

### 7.2 Actions

| Action | Confirmation | Effect |
|---|---|---|
| Sign out | — (immediate) | Ends the session and returns the user to the auth screen. Button shows a spinner and is disabled while in flight. |

### 7.3 Realtime / Permissions / Limits

- **Realtime:** —
- **Permissions:** signed-in users only
- **Limits:** —

---

## 8. Import a Recipe

### 8.1 Full page

- **Route:** `/recipe/import` (presented modally; optional `?tab=paste|type|photo|file` param to deep-link a tab).
- **Header:** `×` close on the left, centred "Import a Recipe" title. Closing always returns to the previous screen (or Home if the stack is empty).
- **Tab bar** under the header, 4 tabs with Feather icons:
  1. **Paste Link** (`paperclip`) — active by default, functional since Phase 7.1
  2. **Type** (`edit-2`) — manual entry; functional (the former "Recipe create" screen lives here)
  3. **Photo** (`camera`) — shown but disabled with a "Soon" pill; wires up in Phase 8
  4. **File** (`file-text`) — shown but disabled with a "Soon" pill; later
- **Legacy route:** `/recipe/create` redirects to `/recipe/import?tab=type` for any lingering links or deep-links that predate Phase 7.

### 8.2 Tab — Paste Link

- Heading "Paste the link to any recipe".
- Subcopy "We'll grab the ingredients, instructions, and photos for you."
- URL input with an `×` clear button; `keyboardType="url"`, autocorrect/autocaps off.
- Primary **Import Recipe** ClayButton with two small sparkle accents. Disabled while the input is empty or the mutation is in flight.
- "Here are some we support:" — 6 styled wordmarks in a 3×2 grid: Allrecipes, Food, Delish, Epicurious, NYT Cooking, Tasty. *(Styled text in our palette, not the sites' actual logos — avoids trademark misuse.)*
- Tip card with the built-in `whisk` sticker, handwritten-font copy "Tip: You can always edit and make it your own.", and a heart icon.
- **On success:** auto-switches to the Type tab, pre-fills every field from the extracted recipe, and shows a sage-left-border banner "Imported from *domain.com* — review and save." with an × to dismiss the banner (user can also clear it via the Type tab × control).
- **On `invalid_url`:** inline red "That doesn't look like a recipe URL." under the input.
- **On `ai_unavailable`:** inline amber "Couldn't read that page right now. Try again in a minute."
- **On `rate_limited`:** inline "You're going a bit fast — try again in a moment."
- **On `monthly_limit_reached`:** replaces the Import button with a card: "You've used X / 20 imports this month" + "Upgrade to Premium" ClayButton (navigates to `/upgrade`).
- **On `partial` (206):** server returns a partial recipe — auto-switches to Type, pre-fills whatever came back, shows a banner indicating partial extraction.

### 8.3 Tab — Type (manual entry)

Same form as the previous "Recipe create" screen. Save button at the bottom of the form (no longer in the header).

| Field | Type | Required | Default | Options / Constraints | Custom allowed | Notes |
|---|---|---|---|---|---|---|
| Title | text | Yes | — | Free text | Yes | Top of form |
| Description | multiline text (~3 rows) | No | — | Free text | Yes | — |
| Servings | number | No | — | Integer | — | number-pad keyboard |
| Prep (min) | number | No | — | Integer, minutes | — | number-pad keyboard |
| Cook (min) | number | No | — | Integer, minutes | — | number-pad keyboard |
| Tags | text | No | — | Comma-separated | Yes | Entered as "quick, veg, soup"; filter pills in Shelves match on these tokens |
| Ingredients | multiline text (~6 rows) | No | — | One per line | Yes | Each line becomes one ingredient |
| Instructions | multiline text (~8 rows) | No | — | One per line | Yes | Each line becomes one step |

When the user arrives here via a Paste Link import, all fields are pre-populated and the top of the form shows the "Imported from *domain.com*" banner. `source_type` is `url_import` when the form was populated via Paste Link (otherwise `manual`).

### 8.4 Tab — Photo (Coming soon)

- Empty state with camera icon and copy: "Snap a photo of a cookbook page or screenshot — we'll read the recipe for you."
- Tab is disabled (no tap action). Will light up in Phase 8 alongside the Telegram bot.

### 8.5 Tab — File (Coming soon)

- Empty state with document icon and copy: "Drop in a PDF or text file and we'll pull out the recipe."
- Tab is disabled. No committed timeline.

### 8.6 Actions

| Action | Confirmation | Effect |
|---|---|---|
| Close (× in header) | — | Dismisses the modal, returns to the previous screen |
| Import Recipe (Paste Link) | — | Calls `extract-recipe` Edge Function; on success pre-fills Type tab |
| Save (Type tab) | — | Creates the recipe; dismisses modal; routes to new Recipe detail. Guarded against double-submit. |
| Upgrade (paywall card) | — | Opens `/upgrade` modal (currently a placeholder screen) |

### 8.7 Realtime / Permissions / Limits

- **Realtime:** —
- **Permissions:** signed-in users only
- **Limits:** URL imports are capped at 20/month on the Free tier (unlimited on Premium). Enforced server-side via `ai_jobs` row counts in the current UTC calendar month. See Appendix A.

---

## 9. Recipe detail

### 9.1 Full page

- **Route:** `/recipe/[id]`
- **Top nav:** back button, a **Clean / Scrapbook** toggle in the centre, and a context action on the right — an **edit pencil ✎** + heart (favourite toggle) in Clean view, or a **Decorate** button in Scrapbook view.
- **Two views:** the user swipes through the segmented toggle between the cooking-friendly Clean view and the decorative Scrapbook preview.

### 9.2 Clean view

Optimised for reading while cooking.

- **Hero:** 240px food image with the recipe title overlaid.
- **Tag row:** pill chips for each tag.
- **Description block** if set.
- **Stats strip:** Prep · Cook · Serves · Total (Prep + Cook).
- **Ingredients list:** headed by the cookbook's *Ingredients* label (or "Ingredients" when the recipe isn't linked to a cookbook). Each ingredient is rendered as a palette-accent bullet + name.
- **Instructions list:** headed by the cookbook's *Method* label (or "Method" by default). Each step is numbered.
- **Share recipe** button: opens the native iOS share sheet with a plain-text representation of the recipe. The share text uses the cookbook's section titles when available.

### 9.3 Scrapbook view

A preview of what the recipe looks like as a cookbook page.

- **A4 page preview** at the recipe's current width × 1.4142 aspect ratio.
- **Decoration** includes washi tape strips at the top, a corner sticker, and an auto-positioned page number.
- **Drawing + sticker layers** render on top of the template if the user has added them in the editor.
- **Template** is the recipe's current selection (see §10.3). Falls back to *Classic* for recipes that have no saved override yet.
- **Decorate** button (top-right) → opens the Recipe editor.

### 9.4 Actions

| Action | Location | Confirmation | Effect |
|---|---|---|---|
| Back | top-left | — | Returns to the previous screen |
| Clean / Scrapbook toggle | top-centre | — | Switches view |
| Edit (✎) | Clean view, top-right | — | Opens `/recipe/edit/<id>` — pre-filled form for title / description / servings / prep+cook / tags / ingredients / steps. Save invalidates the library + detail caches. See §9.6. |
| Favourite (♥ / ♡) | Clean view, top-right | — | Toggles the recipe's favourite state |
| Decorate | Scrapbook view, top-right | — | Opens Recipe editor |
| Share recipe | Clean view, bottom | — | Opens native share sheet with recipe text |

### 9.5 Realtime / Permissions / Limits

- **Realtime:** —
- **Permissions:** signed-in users only; RLS scopes the read to the current user
- **Limits:** —

### 9.6 Edit recipe

- **Route:** `/recipe/edit/[id]`
- **Trigger:** edit pencil (✎) on Clean view, top-right.
- **Form fields:** Title (required), Description, Servings · Prep · Cook (numeric), Tags (comma-separated), Ingredients (one per line), Instructions (one per line). Same form layout as the manual-entry tab in Import a Recipe — both surfaces share `RecipeFormFields` (`src/components/recipe/RecipeFormFields.tsx`) and `recipeForm.ts` helpers.
- **Pre-fill:** loaded once from `fetchRecipe(id)` on mount; subsequent refetches don't clobber unsaved edits.
- **Save changes:** writes through `updateRecipe(id, ...)`, invalidates `['recipes']` + `['recipe', id]`, pops back to detail.
- **Delete recipe:** subtle terracotta-underlined link below Save. Triggers iOS confirmation alert ("Delete this recipe? This can't be undone…"). On confirm: calls `deleteRecipe(id)`, invalidates the library cache, pops both edit AND detail screens off the stack to land in Library (no orphaned 404 detail page).
- **Known v1 limitation:** structured ingredient data (amount / unit / group from AI extraction) flattens to a single string in `name` after a save round-trip. The visible text is preserved; structure is lost. Planned fix: structured ingredient editor with separate amount/unit fields, post-launch.

### 9.7 Realtime / Permissions / Limits — Edit

- **Realtime:** the edit page is read-once; saves go through PostgREST and propagate to other open screens via `useRecipesRealtime`.
- **Permissions:** signed-in users only; RLS scopes update + delete to the current user.
- **Limits:** —

---

## 10. Recipe editor

### 10.1 Full page

- **Route:** `/editor/[recipeId]`
- **Top bar:** close ✕ · recipe title (centred) · undo ↩ · **Done** (spinner while saving).
- **Back navigation** is blocked while a save is in flight to prevent the user from losing edits.

### 10.2 Canvas

The editor renders an A4-proportion canvas with three stacked layers:

1. Page template (ingredients, method, title, hero image — depends on the chosen template)
2. Stickers placed by the user
3. Drawing strokes (Skia) above the template and stickers

Canvas gestures:

- Tap an empty area → deselect
- Tap a sticker or a block → select
- Drag a selected item → move
- Pinch → scale; twist → rotate (stickers)
- Edge-drag (block-edit mode) → resize width (text blocks)

### 10.3 Mode switcher

Three modes across the bottom of the editor plus a **?** help button. Exactly one mode is active at a time.

| Mode icon | Label | Panel |
|---|---|---|
| ⊞ | Layout | Template picker + font picker + "⊹ Arrange Blocks" toggle + reset + font scale toolbar |
| ✱ | Stickers | Sticker tray |
| ✏ | Draw | Drawing toolbar + layer panel toggle |

#### Layout mode

- **Template picker:** horizontal strip of six templates. Each template shows a thumbnail diagram + name. Tapping switches the canvas to that template. If the user has already moved or resized blocks, confirm alert: *"Change template? Changing the template will reset your block arrangement."*
  - **Options:** Classic, Photo Hero, Minimal, Two Column, Journal, Recipe Card
- **Font picker:** horizontal strip of four handwriting presets, each rendered in its own typeface as a preview card.
  - **Options:** Caveat, Marck Script, Bad Script, Amatic SC
- **⊹ Arrange Blocks** (toggle): enables block-level editing — tapping a block selects it, drag handles appear, edge drag resizes, tapping opens a text edit sheet.
- **Reset** (visible only when there are block overrides): clears all position / size / font scale / hidden / text overrides for the current recipe after a confirm alert.
- **Clear** (visible only when there is at least one sticker, drawing stroke, or block override): nuclear "start over" — removes **every** sticker, drawing stroke, and block arrangement from this recipe after a confirm alert. Template and font stay intact. The recipe itself (title, ingredients, instructions) is never touched. Undoable via the editor's ↩ Undo button.
- **Font scale toolbar** (visible only when a text-heavy block is selected): A− / A+ buttons step the scale. The current percent is shown between them.
  - **Range:** 60% – 180% in 10% steps.

#### Stickers mode

Top of the sticker panel: a **Make me Sketch** ClayButton (terracotta, star icon, "Make me Sketch" label).
Below it: a horizontal tray of 16 sticker tiles. Tapping a tile drops a copy onto the centre of the canvas with a small random rotation. The new sticker is auto-selected so the user can drag it into place immediately.

**Make me Sketch** (AI auto-sticker):
- Tapping calls the `auto-sticker` Edge Function. Claude Haiku picks 3–5 stickers that match the recipe's title / description / ingredients / tags; the server rolls their placement in safe zones along the top / bottom / left / right bands of the canvas (avoiding the middle text area) and returns normalised coordinates.
- Stickers appear on the canvas in a **single undo frame** — one tap of the Draw-mode Undo arrow (or the in-app undo action) removes all of them together.
- After a successful sketch a small toast appears below the button: *"Sketched N stickers! Tap undo if you want to try again."* Auto-dismisses after ~3.5 s.
- **Disabled state:** button is greyed out when the recipe has no title yet (nothing for the AI to match on).
- **Error states:**
  - `ai_failed` → "AI didn't find good stickers — try again."
  - `rate_limited` → "A little fast — wait a moment and try again."
  - `ai_unavailable` → "AI is taking a breather. Try again in a minute."
  - `recipe_empty` → "Add a title or ingredients first."
- **Paywall state (`monthly_limit_reached`):** the button is replaced by a card "X / 5 sketches used this month" + "Upgrade to Premium" inner ClayButton (→ `/upgrade`).

**Sticker catalog (16 — all free today):**
Tomato · Lemon · Garlic · Basil · Whisk · Spoon · Pan · Wheat · Strawberry · Flower · Leaf · Heart · Star · Mushroom · Bread · Cherry

#### Draw mode

Drawing toolbar (three rows over a dark chrome strip):

- **Row 1:** brush ✏ / eraser ◻ tool toggle · "Layers" button · Undo ↩
- **Row 2:** 8 colour swatches + a live-preview dot showing the current stroke size and colour
  - **Colour options:** `#3b2a1f`, `#8B6547`, `#c46a4c`, `#6f8a52`, `#c66a78`, `#2f5c8f`, `#faf4e6`, `#ffffff`
- **Row 3:** two sliders
  - **Size:** 1 – 40
  - **Opacity:** 10% – 100%

The eraser uses the active stroke width × 2.

#### Layers panel (Draw mode → Layers)

A bottom sheet listing all layers (ordered top-to-bottom with the topmost drawing layer at the top). Each row has:

- Visibility toggle (◉ / ○)
- Layer name (auto-named "Layer 1", "Layer 2", …)
- Blend mode pill — cycles through **normal → multiply → overlay → screen → soft-light** on tap
- Opacity percent (read-only on the row)
- Up / down reorder arrows
- Delete × (only shown when more than one layer exists)

A **"+ Add"** button appears in the header until the user reaches the 5-layer cap.

### 10.4 Modal — Block item editor

Opened from a tap on a text-heavy block in Arrange Blocks mode. A bottom sheet with:

| Field | Type | Required | Default | Options / Constraints | Custom allowed | Notes |
|---|---|---|---|---|---|---|
| Block text | multiline text | No (saving empty restores the original) | Current block text | Free text | Yes | Autofocused |

Buttons: **Cancel** · **Remove from page** · **Done** (save).

### 10.5 Layout & precedence rules

When the editor hydrates, template and font are resolved in this order:

1. **Per-recipe override** (if the user has picked a template or font inside this specific recipe)
2. **Cookbook default** (if the recipe is linked to a cookbook that has a default)
3. **App fallback** (Classic template, Caveat font)

Changing the template in Layout mode persists to the per-recipe override — it does not mutate the cookbook default. Changing the cookbook default does not overwrite any recipe that already has a per-recipe override.

### 10.6 Actions

| Action | Location | Confirmation | Effect |
|---|---|---|---|
| Close ✕ | top bar | Blocked while a save is in flight | Returns without saving; unsaved template / font / block changes remain in the client canvas store |
| Undo ↩ | top bar | — | Steps back the canvas history (up to 50 steps) |
| Done | top bar | — | Persists template + font overrides to the server. Spinner while in flight; alerts "Save failed" if the server rejects. |
| Change template | Layout mode | Confirms only if the user has block overrides | Switches template; resets block arrangement if confirmed |
| Change font | Layout mode | — | Switches handwriting font; no reset |
| Reset block overrides | Layout mode, when overrides exist | Confirm alert | Clears all block overrides, step overrides, ingredient overrides |
| Add sticker | Stickers mode | — | Drops sticker at centre of canvas |
| Delete sticker | selected sticker → drag to trash / toolbar delete | — | Removes the sticker (undo-able) |
| Commit stroke | Draw mode | — | Appends the stroke to the active drawing layer |
| Toggle layer visibility | Layers panel | — | Hides / shows the layer |
| Reorder layers | Layers panel | — | Moves the layer up / down in the stack |
| Delete layer | Layers panel, when > 1 layer exists | — | Removes the layer |
| Edit block text | Arrange Blocks → tap block | — | Opens Block item editor |
| Remove block from page | Block item editor | — | Hides the block; recoverable via Reset |

### 10.7 Realtime / Permissions / Limits

- **Realtime:** —
- **Permissions:** signed-in users only; a recipe can only be opened by its owner
- **Limits:** 5 drawing layers · 50-snapshot undo history · block font scale 60% – 180%

---

## 11. Book Builder

### 11.1 Full page

- **Route:** `/book/[cookbookId]`
- **Header:** back ‹ · editable title (tap to rename inline — text field with autofocus) · ⚙︎ settings · **Export** button (pops an alert: "Export — coming soon").
- **Body:** drag-reorderable list of pages. An "+ Add page" button sits below the list.

### 11.2 Inline title edit

Tapping the cookbook title in the header swaps it for a text input. Submitting (return) or blurring saves. Spinner on the field while the mutation is in flight; failures surface an alert.

### 11.3 Modal — Settings

Opened from the ⚙︎ icon. A bottom sheet with four configurable groups.

**Defaults that apply to recipes added to this cookbook:**

| Field | Type | Required | Default | Options / Constraints | Custom allowed | Notes |
|---|---|---|---|---|---|---|
| Default template | picker | No | — (app falls back to Classic) | Classic · Photo Hero · Minimal · Two Column · Journal · Recipe Card | No | Same picker as in the editor |
| Default handwriting font | picker | No | — (app falls back to Caveat) | Caveat · Marck Script · Bad Script · Amatic SC | No | Same picker as in the editor |

**Section titles (applied to every recipe in this cookbook unless overridden by the user):**

| Field | Type | Required | Default | Options / Constraints | Custom allowed | Notes |
|---|---|---|---|---|---|---|
| Ingredients label | text | No | "Ingredients" | ≤ 40 characters; empty = fall back to default | Yes | Free text; supports Cyrillic / non-English strings |
| Method label | text | No | "Method" | ≤ 40 characters; empty = fall back to default | Yes | Free text; supports Cyrillic / non-English strings |

Footer: **Cancel** · **Save**. A small footnote reads "Paper type is coming next." Save is disabled when there are no changes; spinner while in flight. The sheet keyboard-lifts to keep inputs visible when the user focuses either label field.

### 11.4 Page list

Each page is a row with a thumbnail area, the page type icon + label, and a position number.

- **Drag** (long-press and slide) to reorder pages. Reorder persists after the drop.
- **Swipe-Delete (red)** removes the page after a confirm alert. Guarded against double-tap.
- **Tap** opens:
  - Recipe pages → the Recipe editor
  - Non-recipe pages (cover, dedication, etc.) → the stub detail screen (see §12)

**States:**

| State | What the user sees |
|---|---|
| Loaded | Reorderable list of pages |
| Empty | Centred empty state — 📖 icon, "Empty cookbook", and a "+ Add page" button |
| Loading | Inline spinner |
| Error | Inline error card |

### 11.5 Modal — Add page

Opened from the "+ Add page" button. A bottom sheet listing the 8 page types:

| Icon | Label | Description | Limit |
|---|---|---|---|
| 🍳 | Recipe | Add a recipe from your collection | — |
| 📕 | Cover | Title page with cookbook name | Max 1 per cookbook |
| 💌 | Dedication | A personal note to the recipient | — |
| 📋 | Table of Contents | Auto-generated from recipe pages | Max 1 per cookbook |
| ✍️ | About / Intro | Your story behind this cookbook | — |
| 🔖 | Chapter Divider | Separate sections visually | — |
| 📄 | Blank Page | Free canvas for notes or photos | — |
| 🎀 | Closing | A final message or sign-off | — |

When the cap is reached, the row dims and shows "✓ Added" next to the label.

**Recipe sub-picker** — Selecting "Recipe" replaces the sheet with:

- a search field ("Search recipes…", autofocused; the sheet rises above the iOS keyboard)
- a vertical list of the user's recipes (title + up to three tags per row)
- an empty state "No recipes found" when the search yields zero matches
- a "‹ Back" button to return to the page-type menu

Tapping a recipe adds it as a new page. The first time a recipe is added to any cookbook, the recipe becomes *linked* to that cookbook — subsequent book defaults (template, font, section titles) apply to it automatically. Adding the same recipe to a second cookbook does not move its link.

### 11.6 Modal — Table of Contents preview

A read-only list of recipe pages with auto-numbered page positions. Empty state: "No recipe pages yet."

### 11.7 Actions (summary)

| Action | Confirmation | Effect |
|---|---|---|
| Back ‹ | — | Return to Shelves |
| Edit title (inline) | — | Persists rename; invalidates cookbook detail + list caches |
| ⚙︎ Settings | — | Opens Settings modal |
| Export | alert only | "Export — coming soon" |
| "+ Add page" | — | Opens Add page modal |
| Drag page | — | Reorders |
| Swipe-Delete page | confirm alert | Removes page |
| Tap recipe page | — | Opens Recipe editor |
| Tap non-recipe page | — | Opens stub detail |

### 11.8 Realtime / Permissions / Limits

- **Realtime:** —
- **Permissions:** signed-in users only; a cookbook can only be opened by its owner
- **Limits:** 1 cover page per book · 1 table of contents per book · section title labels ≤ 40 characters

---

## 12. Non-recipe book page stubs

### 12.1 Full page

- **Route:** `/book/page-stub?type=<page-type>`
- **Purpose:** every non-recipe page type routes here. The screen is a friendly placeholder so users can still see their page list grow while the dedicated editors are being built.

### 12.2 Content

- Page-type icon (matches the Add page modal)
- Heading "Coming soon"
- Description: "The <page type> editor will let you add text, photos, and decorations using the same canvas tools as recipe pages."
- A "← Back to cookbook" link

### 12.3 Actions

| Action | Effect |
|---|---|
| Back (top) | Return to Book Builder |
| "← Back to cookbook" | Return to Book Builder |

### 12.4 Realtime / Permissions / Limits

- **Realtime:** —
- **Permissions:** signed-in users only
- **Limits:** —

---

## 13. Integrations

### 13.1 Wired today

| Integration | What it does |
|---|---|
| **Supabase Auth** | Email + password sign-up and sign-in, session persistence, auto-refresh gated by app foreground state |
| **Supabase Postgres** | Storage for recipes, cookbooks, book pages, per-recipe canvas overrides; row-level security scopes every read and write to the signed-in user |
| **Supabase Storage** | Image uploads (recipe cover images, sticker / stock imagery) are served over Supabase's public URLs |
| **Expo SecureStore** | iOS Keychain storage of the Supabase session token |

### 13.2 Not yet wired

These appear in the project's planning docs but are **not present in the app today**:

- **Push notifications.** The `expo-notifications` SDK is not a dependency, no push-token registration code exists, and no push token is ever written from the client. The database reserves a column for a future token, but nothing populates it.
- **Claude (Haiku) AI** — for "Make me Sketch" styling, photo → recipe OCR, and URL import. No Edge Function calls in the client today.
- **RevenueCat** — no IAP or subscription SDK is integrated; there is no tier concept surfaced in the UI.
- **PostHog** — no analytics SDK wired; no event instrumentation today.
- **Sentry** — no error tracking wired; errors surface only via in-app error boundaries and `Alert.alert`.
- **Lulu xPress print-on-demand** — no export or order flow; the Export button in Book Builder is a stub.
- **Telegram recipe bot** — no inbound flow from a bot today. All recipes are created manually in the app.
- **Stripe** — not integrated on the client.
- **Apple / Google sign-in** — not implemented.
- **Magic-link sign-in** — not implemented.
- **Password reset / forgot password** — not implemented.
- **Realtime subscriptions** — the app does not subscribe to any Supabase realtime channels.
- **Internationalisation (i18n)** — English only.
- **PDF export** — placeholder "Coming soon" alert only.
- **MMKV** — not installed; the fast-cache layer planned for onboarding flags is not in place.

---

## Appendix A — Entity limits

| Entity | Limit |
|---|---|
| Password length | ≥ 6 characters |
| Cookbook section title (Ingredients / Method) | ≤ 40 characters each |
| Cover pages per cookbook | ≤ 1 |
| Table of contents pages per cookbook | ≤ 1 |
| Drawing layers per recipe | ≤ 5 |
| Canvas undo history | ≤ 50 snapshots |
| Block font scale | 60% – 180% in 10% steps |
| Drawing stroke width | 1 – 40 |
| Drawing stroke opacity | 10% – 100% |
| Palette options | 4 (Terracotta, Sage, Blush, Cobalt) |
| Template options | 6 (Classic, Photo Hero, Minimal, Two Column, Journal, Recipe Card) |
| Handwriting font options | 4 (Caveat, Marck Script, Bad Script, Amatic SC) |
| Book page types | 8 (Recipe, Cover, Dedication, Table of Contents, About / Intro, Chapter Divider, Blank, Closing) |
| Built-in stickers | 16 (Essentials pack, all free) |
| Drawing blend modes | 5 (Normal, Multiply, Overlay, Screen, Soft light) |
| URL recipe imports | Free: 20 / month; Premium: unlimited (server-enforced in `extract-recipe`) |
| Auto-sticker ("Make me Sketch") calls | Free: 5 / month; Premium: unlimited (server-enforced in `auto-sticker`) |
| AI rate limit (any user, any AI function) | 1 call / 10 seconds (server-enforced) |
| Scraped page cap (URL import) | 200 KB downloaded, 20 000 characters fed to Haiku, 10s fetch timeout, ≤ 3 redirects |

---

## Appendix B — Enum values

This appendix lists UI-visible enumerations where a future doc might need the exact label list.

**Palettes:** Terracotta · Sage · Blush · Cobalt

**Templates:** Classic · Photo Hero · Minimal · Two Column · Journal · Recipe Card

**Handwriting fonts:** Caveat · Marck Script · Bad Script · Amatic SC

**Book page types:** Recipe · Cover · Dedication · Table of Contents · About / Intro · Chapter Divider · Blank Page · Closing

**Drawing tools:** Brush · Eraser

**Drawing blend modes:** Normal · Multiply · Overlay · Screen · Soft light

**Recipe source types (only "Manual" is reachable from the UI today):** Manual · URL import · Screenshot import · Telegram link · Telegram screenshot

**Shelves filter pills:** All · Favourites · Quick · Veg · Baking · Soups

**Stickers (Essentials pack, all free):** Tomato · Lemon · Garlic · Basil · Whisk · Spoon · Pan · Wheat · Strawberry · Flower · Leaf · Heart · Star · Mushroom · Bread · Cherry
