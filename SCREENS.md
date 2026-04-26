# Spoon & Sketch — Screen UX Specs (Critical Path)

> Senior UX breakdown for the 7 screens that form the gift flow:
> Onboarding → Home → Import Recipe → Create Recipe → Canvas Editor → Book Builder → Print Order
>
> For each screen: purpose · UI elements · user actions · empty/error states · navigation · microcopy · cleanliness notes

---

## Screen 00 — Onboarding (7 steps)

**Route:** `/onboarding` (shown once, MMKV flag `onboarding_complete`)

**Purpose:** Convert a cold install into a motivated, signed-up user who has seen the app's emotional value before committing. No account required until the last step.

---

### Step 1 — Splash / Hero

**UI elements:**
- Full-screen food illustration (FoodImage SVG placeholder, painterly style)
- Paper-grain texture overlay (SVG feTurbulence, opacity 0.4)
- App logo centered: "Spoon & Sketch" in Fraunces 40px, `--ink`
- Tagline below in Caveat 22px, `--inkSoft`: "a scrapbook cookbook"
- 3–4 stickers scattered freely: tomato (top-left, -12deg), leaf (bottom-right, +8deg), cherry (top-right, +5deg)
- Primary clay button: "Get started" (full width, terracotta)
- Text link below: "I already have an account" (`--inkFaint`, 14px)

**User actions:**
- Tap "Get started" → Step 2
- Tap "I already have an account" → Sign in modal (magic link + Apple + Google), then → Home

**Empty / error states:** none (static screen)

**Navigation:** forward-only swipe disabled; only button advances

**Microcopy:**
- Button: `Get started`
- Link: `I already have an account`
- Tagline: `a scrapbook cookbook`

**Cleanliness notes:**
- No back button, no header, no tab bar — full immersion
- Stickers add warmth but must not obscure logo or button
- Gradient scrim (paper → transparent) at top and bottom keeps text legible over illustration

---

### Step 2 — The gift angle

**UI elements:**
- Fraunces 28px headline: "Make a cookbook someone will keep forever"
- Nunito 16px body, `--inkSoft`: "Decorate recipes, add a handwritten dedication, then order a real printed book."
- Polaroid-style mockup card (food image + sticker + washi tape corner, 280×340px, +2deg tilt)
- Progress dots: ● ○ ○ centered at bottom
- "Next" text button top-right (Nunito 15px, terracotta)
- Swipe-right to advance

**User actions:**
- Tap "Next" or swipe → Step 3
- Tap "Back" (if shown) or swipe left → Step 1

**Microcopy:**
- Headline: `Make a cookbook someone will keep forever`
- Body: `Decorate recipes, add a handwritten note, then order a real printed book.`
- Button: `Next`

**Cleanliness notes:**
- One visual anchor (the polaroid), one text block, one action — nothing else
- Progress dots remain in same position across all 3 value-prop steps

---

### Step 3 — Zero effort, beautiful result

**UI elements:**
- Fraunces 28px: "Beautiful with one tap"
- Nunito 16px body: "Hit "Make me Sketch" and the app decorates your recipe automatically."
- Side-by-side or stacked before/after: plain recipe card → decorated card with stickers
- "Make me Sketch" label shown on the after card (Caveat, terracotta bg pill)
- Progress dots: ○ ● ○

**Microcopy:**
- Headline: `Beautiful with one tap`
- Body: `Tap "Make me Sketch" — the app picks stickers that match your recipe and places them automatically.`
- Before label: `Plain recipe`
- After label: `After one tap ✦`

---

### Step 4 — Import from anywhere

**UI elements:**
- Fraunces 28px: "Add recipes your way"
- Three option rows (icon + title + subtitle):
  - Telegram icon · "Telegram bot" · "Send a link, get a recipe"
  - Link icon · "Paste a URL" · "Any recipe website"
  - Pencil icon · "Type it yourself" · "Start from a blank page"
- Progress dots: ○ ○ ●

**Microcopy:**
- Headline: `Add recipes your way`
- Row 1: `Telegram bot` / `Send a link, get a recipe`
- Row 2: `Paste a URL` / `From any recipe website`
- Row 3: `Type it yourself` / `Start from scratch`

---

### Step 5 — Intent picker

**UI elements:**
- Fraunces 26px: "What are you making?"
- Two large tap cards (full width, 140px tall each, paper card style):
  - Card A: large gift emoji · "A gift for someone" · Caveat 14px subtext: "I'll make a cookbook to give away"
  - Card B: book emoji · "My own cookbook" · Caveat 14px: "Building my personal recipe collection"
- Selected card gets terracotta ring border + subtle scale-up
- No "Next" button — selection auto-advances after 400ms

**Empty state:** neither card selected — button disabled (greyed)

**Microcopy:**
- Headline: `What are you making?`
- Card A title: `A gift for someone`
- Card A sub: `I'll make a cookbook to give away`
- Card B title: `My own cookbook`
- Card B sub: `Building my personal recipe collection`

**Cleanliness notes:** Only 2 choices. No scrolling. No skip. Forces intent that personalises the rest of the flow.

---

### Step 6 — Palette picker

**UI elements:**
- Caveat 26px: "Pick your style"
- Nunito 14px body: "You can change this any time in settings."
- 4 large palette swatches (full width, 80px tall each), each showing: swatch colour + name + mini app preview thumbnail
  - Terracotta (default — pre-selected), Sage, Blush, Cobalt
- "This looks good →" primary clay button (label updates to chosen palette name)

**Microcopy:**
- Headline: `Pick your style`
- Subtext: `You can always change this later in Settings.`
- Button: `This looks good →` (or `Terracotta → Next`)

---

### Step 7 — Sign up / Sign in

**UI elements:**
- Fraunces 24px: "Create your account"
- Nunito 14px, `--inkSoft`: "Your cookbook saves automatically."
- Magic link email input (Nunito 16px, inset shadow, placeholder: "your@email.com")
- "Send magic link" primary button
- Divider: `or`
- "Continue with Apple" (black button, required for App Store) — auto-hidden if `AppleAuthentication.isAvailableAsync()` returns false (Expo Go); appears in custom dev client + TestFlight builds.
- "Continue with Google" (white/outlined)
- **Consent rows** (rendered above the buttons, 4 toggle rows on paper-card style):
  - **Privacy Policy** — required. Tap row → opens live PP. Toggle disabled-on by default; user must turn ON to enable Create button.
  - **Terms of Service** — required. Same pattern.
  - **AI processing** — optional. "Let us process your recipes / photos / text via Anthropic / OpenAI." Default OFF. Toggling OFF post-signup disables AI tabs in the app.
  - **Marketing emails** — optional. Default OFF.
- Legal text (12px, `--inkFaint`): "By continuing you agree to our Terms and Privacy Policy." — kept as a backstop label even though the consent rows above already cover it.

**Empty state:** Email field empty → button disabled

**Error states:**
- Invalid email: inline field error below input — `That doesn't look like an email address.`
- Magic link already sent: replace button with — `Check your inbox — link sent to {email}` + `Resend` text link
- Network failure: toast — `Couldn't send the link. Check your connection and try again.`
- Apple Sign In failure: toast — `Apple Sign In didn't complete. Try again or use email.`

**Navigation:** After successful auth → Home (tab bar appears, onboarding dismissed)

**Microcopy:**
- Headline: `Create your account`
- Subtext: `Your cookbook saves automatically.`
- Email placeholder: `your@email.com`
- Primary button: `Send magic link`
- Success state: `Check your inbox — we sent a link to {email}`
- Resend link: `Resend`
- Apple button: `Continue with Apple`
- Google button: `Continue with Google`

**Cleanliness notes:**
- Sign up is the LAST step, not the first — user already sees value
- Legal text is present but tiny and non-intrusive
- No password field, no confirm password, no username — magic link only (target UX)

**Today's implementation (2026-04-25 — diverges from spec above):**
The live `/login` screen ships email + password (with confirm-password on Create) instead of magic link, because deep-link return from Supabase confirmation email isn't wired yet. Apple Sign In, the 4 consent rows, and the legal text DO match the spec. Magic link is targeted for v1.1 once Universal Links + the post-confirmation deep-link handler are built.

---

## Screen 01 — Home / Welcome

**Route:** `/` (tabs/index)

**Purpose:** Daily driver. Shows the user's cookbook shelf and a recipe prompt. Feels like opening a cozy recipe book, not a productivity app.

**UI elements:**
- **Header panel** (340px tall on 360px phone, paper grain + gradient scrim):
  - FoodImage SVG as background (full bleed)
  - Top: status bar safe area
  - Bottom-left: greeting in Caveat 20px `--paper`: "good morning, {firstname}" (time-aware: morning/afternoon/evening)
  - Below greeting: active cookbook title in Fraunces 28px `--paper`
  - Corner stickers: leaf + tomato, scattered, natural rotation
- **"Today's pick" card** (margin 16px, paper card, slight shadow):
  - Food image (square, 80px)
  - Recipe title in Fraunces 16px
  - Time + tag pill
  - Right arrow →
- **"Your shelves" section**:
  - Section header: Fraunces 18px "Your shelves" + "See all →" (terracotta, 14px)
  - Horizontal scroll of cookbook cards (each 160×200px, slight rotation ±1deg, paper card):
    - Cover image, sticker peeking at corner, name in Fraunces 14px, recipe count in Caveat
- Tab bar: Home · Shelves · + (FAB, terracotta) · Elements · Me

**User actions:**
- Tap Today's pick → Recipe Detail (04a, scrapbook view)
- Tap cookbook card → Library filtered to that cookbook (02a)
- Tap "See all →" → Shelves tab (07)
- Tap FAB (+) → Import Recipe (03a)
- Tap Elements → My Elements (08)
- Tap Me → Profile & Settings (15)

**Empty state (new user, no recipes yet):**
- Header shows: "Welcome to Spoon & Sketch" (Fraunces), "Your cookbook is ready. Add your first recipe." (Caveat)
- No "Today's pick" card
- Single cookbook card with dashed border + "+" icon: "Add your first recipe"
- Subtle animated sticker bouncing on the empty card (whisk or spoon)

**Empty state (has cookbook, no decorated pages):**
- "Today's pick" shows a recipe card but with plain view + nudge banner: "This recipe has no scrapbook page yet. Decorate it →"

**Error states:**
- Failed to load recipes: card placeholder with terracotta outline + "Couldn't load your recipes. Pull to refresh."
- No internet on first load: "You're offline. Connect to see your latest recipes."

**Navigation pattern:** Root tab screen. No back button. Persistent tab bar.

**Microcopy:**
- Greeting: `good morning, {name}` / `good afternoon, {name}` / `good evening, {name}`
- Today's pick section: `Today's pick`
- Shelves section: `Your shelves`
- See all link: `See all →`
- Empty headline: `Your cookbook is ready.`
- Empty sub: `Add your first recipe to get started.`
- Empty card: `+ Add a recipe`
- Offline toast: `You're offline — showing your last saved recipes.`

**Cleanliness notes:**
- Header has maximum 2 lines of text + greeting — never more
- "Today's pick" is one card, never a carousel — avoids decision fatigue
- Shelves scroll is passive browsing — no required interaction
- No notifications, no badges, no red dots on this screen

---

## Screen 03a — Import Recipe

**Route:** `/recipe/import` (shown when FAB tapped)

**Purpose:** Zero-friction entry point for getting a recipe into the app. Three paths; all land on the same review form (03b).

**UI elements:**
- Sheet modal (slides up from bottom, 80% screen height, rounded top corners 24px)
- Drag handle at top
- Title: "Add a recipe" (Fraunces 22px, centered)
- **Option A — URL import:**
  - Text input (full width, inset shadow, auto-focus on open)
  - Placeholder: "Paste any recipe link…"
  - "Import" button (terracotta, right of input)
  - Below input: loading state → "Reading recipe…" with spinning tomato sticker
- **Divider:** `or`
- **Option B — Screenshot:**
  - Outlined button: "Upload a photo or screenshot" (image icon left)
  - On tap: native image picker (camera or library)
  - Selected: shows thumbnail preview (80×80px) + filename + "Extract recipe →" button
- **Divider:** `or`
- **Option C — Manual:**
  - Text link: "Type it myself →" (terracotta, centered, 15px)

**User actions:**
- Paste URL → tap "Import" → loading → pre-filled Create/Edit form (03b)
- Tap upload → choose image → loading → pre-filled Create/Edit form (03b)
- Tap "Type it myself →" → blank Create/Edit form (03b)
- Swipe down / tap X → dismiss modal, return to Home

**Empty state:** Input empty → "Import" button disabled (opacity 0.4)

**Error states:**
- Invalid URL (not a URL): inline — `That doesn't look like a link. Paste a full URL starting with https://`
- URL scraping fails (site blocked / paywall): bottom banner — `We couldn't read this page fully. We've saved what we found — edit the recipe to fill in the rest.` → opens 03b with partial data
- Image too large (>20MB): `This image is too large. Try a screenshot under 20MB.`
- AI extraction timeout (>30s): `This is taking longer than usual. We'll notify you when it's ready.` → dismisses modal, push notification on completion
- No internet: `You're offline. Import needs a connection — or type the recipe yourself.`

**Navigation pattern:** Modal sheet. Dismiss returns to previous screen. On success, replaces self with 03b (no back stack pile-up).

**Microcopy:**
- Modal title: `Add a recipe`
- URL placeholder: `Paste any recipe link…`
- Import button: `Import`
- Loading: `Reading recipe…`
- Upload button: `Upload a photo or screenshot`
- After image selected: `Extract recipe →`
- Manual link: `Type it myself →`
- Partial import banner: `Couldn't read everything — edit the recipe to fill in the rest.`
- Timeout: `Taking longer than usual — we'll notify you when it's ready.`

**Cleanliness notes:**
- Auto-focus URL input so user can paste immediately
- Loading spinner uses a thematic sticker (tomato spinning) — keeps the cozy tone during wait
- Three options flow top to bottom by likelihood of use (URL most common, manual least)
- No option requires explanation — icons + labels are self-evident

---

## Screen 03b — Create / Edit Recipe

**Route:** `/recipe/create` (new) · `/recipe/[id]/edit` (existing)

**Purpose:** Structured recipe data entry. The functional backbone. Every field here feeds Cook Mode, PDF, and Book Builder. Must feel like filling in a beautiful recipe card, not a form.

**UI elements:**
- Top bar: `✕` close (left) · "New Recipe" / "Edit Recipe" (center, Fraunces 18px) · "Save" clay button (right, terracotta)
- **Cover photo area** (180px tall, full width − 16px margin, rounded 18px):
  - FoodImage placeholder or user image
  - "Change photo" overlay (dark scrim, camera icon, Nunito 14px)
  - Leaf sticker bottom-right corner of photo
- **Title field** (Fraunces 26px, `--ink`, no border, full width, placeholder in `--inkFaint`)
- **Subtitle / note field** (Caveat 18px, single line, placeholder in `--inkFaint`)
- **Quick stats row** (3 equal cards, 100px each, paper card style):
  - Prep · Cook · Serves (icon + editable value + unit label)
- **Ingredients section** (card, dashed inner border):
  - Section header: "Ingredients" (Fraunces 15px)
  - Ingredient rows: checkbox + amount + unit + name (3 fields per row)
  - "Add ingredient" footer row (+ icon, `--inkFaint`)
- **Steps section**:
  - Section header: "Method" (Fraunces 15px)
  - Step rows: numbered circle (butter gradient) + textarea
  - "Add a step" footer row
- **Tags row**: scrollable pill tags + "+ Add tag" chip
- **Source URL row** (if imported): chain-link icon + truncated URL (read-only, tap to open)
- **Floating bottom bar** (dark, #2a1f16, safe-area padding):
  - Brush icon · "Make it a scrapbook page →" (Nunito 15px, `--paper`)

**User actions:**
- Edit any field inline
- Tap cover photo → image picker
- Tap stat card → numeric input keyboard
- Tap "Add ingredient" → new row added, focused
- Swipe ingredient row left → delete (red bin icon)
- Long-press ingredient row → drag to reorder
- Tap "Add a step" → new step added
- Tap tag chip → tag input appears
- Tap "Make it a scrapbook page →" → Canvas Editor (05a) with this recipe pre-loaded
- Tap "Save" → saves to Supabase, returns to library
- Tap ✕ → confirmation if unsaved changes: "Discard changes?" · "Discard" · "Keep editing"

**Empty state (blank form):**
- Title placeholder: `Recipe name`
- Subtitle placeholder: `A little note in your own words…`
- Stat placeholders: `0 min` / `0 min` / `0`
- Ingredients section shows one empty row ready to type
- Steps section shows one empty step

**Error states:**
- Save without title: title border flashes terracotta + inline: `Give this recipe a name first.`
- Image upload fails: revert to placeholder + toast: `Couldn't upload photo — recipe saved without it.`
- Save network failure: toast: `Couldn't save — check your connection.` + retry button

**Navigation pattern:** Pushed screen (not modal). Back = ✕. On Save, pops back to Library. "Make it a scrapbook page" pushes Editor onto stack.

**Microcopy:**
- Screen title (new): `New recipe`
- Screen title (edit): `Edit recipe`
- Save button: `Save`
- Title placeholder: `Recipe name`
- Subtitle placeholder: `A little note in your own words…`
- Prep label: `Prep`
- Cook label: `Cook`
- Serves label: `Serves`
- Ingredients header: `Ingredients`
- Add ingredient: `+ Add ingredient`
- Method header: `Method`
- Add step: `+ Add a step`
- Tags: `+ Add tag`
- Scrapbook bar: `Make it a scrapbook page →`
- Discard alert title: `Discard changes?`
- Discard confirm: `Discard`
- Discard cancel: `Keep editing`
- Validation: `Give this recipe a name first.`

**Cleanliness notes:**
- Title and subtitle have NO visible borders — they look like typed text, not form fields. Border only appears on focus.
- Ingredient rows show checkbox column even in edit mode — visual consistency with Cook Mode
- "Make it a scrapbook page" bar is always visible, never scrolls away — it's the CTA that leads to the app's differentiator
- Stats row uses icons + value pairs, no label stacking — clean at a glance

---

## Screen 05a — Canvas Editor

**Route:** `/editor/[recipeId]`

**Purpose:** The heart of the app. Where a plain recipe becomes something beautiful. Must feel like a creative playground, not a design tool.

**UI elements:**
- **Background:** dark `#2a1f16` (creates contrast, makes the paper canvas pop)
- **Top bar:**
  - `✕` close (left, `--paper`)
  - Recipe name in Nunito 14px, `--inkFaint` (truncated)
  - Eye icon → preview mode
  - "Save" clay button (right, terracotta)
- **Canvas** (paper `#faf4e6`, border-radius 18px, fills most of screen with 12px side padding):
  - All editable elements render here (image, stickers, text, tape, drawing)
  - Selected element: dashed terracotta outline + 4 corner scale handles + rotation handle (circle above top edge)
- **Context toolbar** (appears above selected element, dark pill):
  - Replace · Size · Rotate · Layer up/down · Delete
- **"Make me Sketch" floating button** (bottom-left of canvas area, only when no element selected):
  - Sparkle icon + "Make me Sketch" (Caveat 14px, terracotta bg)
- **Bottom tool panel** (dark `#1a1108`, slides up 72px, rounded top):
  - Tab row: Layouts · Stickers · Photos · Text · Tape · Draw
  - Active tab content (horizontal scroll):
    - **Stickers:** 4-row scroll grid of 54×54 tiles, built-in 16 + uploaded
    - **Layouts:** 6 template thumbnails (Journal, Postcard, Polaroid, Recipe Card, Magazine, Diary)
    - **Photos:** user's uploaded images + "Add photo" tile
    - **Text:** font pickers (Fraunces/Caveat/Nunito) + size + color
    - **Tape:** washi tape patterns (4 colours × 3 patterns = 12 tiles)
    - **Draw:** opens Drawing Mode (05c)

**User actions:**
- Tap element → selects it (shows handles + context toolbar)
- Drag element → moves it
- Pinch element → scales it
- Rotate handle drag → rotates element
- Tap context toolbar "Delete" → removes element with fade-out
- Tap sticker tile → drops sticker onto canvas center, then drag to place
- Tap "Make me Sketch" → AI auto-places stickers (loading: sparkle animation, ~3s)
- Tap "Draw" tab → transitions to Drawing Mode (05c)
- Tap eye icon → preview mode (elements non-interactive, no handles)
- Tap "Save" → generates thumbnail snapshot, saves to DB, pops back
- Shake device (or undo button) → undo (depth 50)

**Empty state (recipe has no canvas yet):**
- Canvas opens with recipe's food image already placed (centered, scaled to fit)
- Recipe title placed as Fraunces text block at top
- "Start here → tap a sticker to decorate" nudge tooltip (Caveat, terracotta, dismissable)

**Error states:**
- "Make me Sketch" AI call fails: `Couldn't auto-decorate right now. Try again in a moment.` (dismissable bottom toast, sparkle icon)
- Save fails: `Couldn't save your page. Try again.` + retry button in bar
- Image asset fails to load: placeholder food image with dashed border
- Undo stack empty: undo button fades (no error needed — silent)

**Navigation pattern:** Pushed screen. "Save" pops back. ✕ asks "Discard changes?" if unsaved. Preview mode is in-place toggle (no route change).

**Microcopy:**
- Save button: `Save page`
- Make me Sketch button: `Make me Sketch`
- Make me Sketch loading: `Decorating…`
- Make me Sketch success: `Done! Move anything you like.`
- Make me Sketch fail: `Couldn't auto-decorate — try again.`
- Context toolbar: `Replace` · `Smaller` / `Larger` · `Rotate` · `Send back` / `Bring forward` · `Delete`
- Preview toggle: `Preview` / `Edit`
- Discard alert: `Discard changes?` · `Discard` · `Keep editing`
- Empty canvas nudge: `Tap a sticker to start decorating`

**Tab labels:** `Layouts` · `Stickers` · `Photos` · `Text` · `Tape` · `Draw`

**Cleanliness notes:**
- Dark editor background is intentional — creates studio feel, makes the paper canvas the star
- "Make me Sketch" is always visible when no element selected — it's the path of least resistance
- Context toolbar appears near the element, not at top — reduces eye travel
- Bottom tray shows previews of content, not abstract icons — user knows what they'll get before tapping
- No floating panels, no nested menus — one level deep maximum

---

## Screen 10 — Book Builder

**Route:** `/book/[cookbookId]`

**Purpose:** Assembles the full gift book. This is where loose decorated recipes become a coherent, printable product with a cover, dedication, chapters, and an order button.

**UI elements:**
- **Top bar:** back arrow · "My Cookbook" (cookbook title, Fraunces 20px) · "Order book →" (terracotta button, right)
- **Progress strip** (below bar): X pages · estimated print cost · "Preview" link
- **Page list** (vertical scroll, each page row 80px tall):
  - Page thumbnail (60×78px, paper card with micro shadow)
  - Page type label (Caveat 13px, `--inkFaint`): "Cover" / "Dedication" / "Chapter" / "Recipe" / "Closing"
  - Page title (Fraunces 15px): cookbook title / "For {name}..." / recipe name / etc.
  - Status chip (right): ✓ `Done` (sage) · `Edit →` (terracotta outline) · `Add content` (dashed, `--inkFaint`)
  - Drag handle (right edge) — reorder pages
  - "+" insert row between pages (thin dashed line with centered + icon, appears on hover/long-press)
- **Add page sheet** (on + tap, bottom sheet):
  - Options: Cover · Dedication · About · Chapter divider · Blank · Closing
  - Tap to insert at current position
- **"Order this book" sticky footer** (safe-area bottom, terracotta gradient bar):
  - "X pages ready · Order a printed copy →"

**Page type states in the list:**

| Page type | Thumbnail | Status when empty |
|---|---|---|
| Cover | Palette-tinted cover preview | `Add a title and photo →` |
| Dedication | Lined paper, "For…" Caveat text | `Write a personal message →` |
| About / Intro | Text-lined preview | `Tell the story of this cookbook →` |
| Chapter divider | Coloured block + chapter title | `Name this chapter →` |
| Recipe page | Canvas thumbnail | `Decorate this recipe →` (if no canvas) |
| Blank | Empty lined paper | (no nudge needed) |
| Closing | Text-lined preview | `Add a closing note →` |
| Table of Contents | Auto-generated (read-only) | Auto — no action required |

**User actions:**
- Tap any page row → opens that page's editor (Cover → 11a, Dedication → 11b, Recipe → 05a, etc.)
- Long-press page → drag to reorder
- Tap "+" between pages → insert page sheet
- Swipe page row left → delete page (confirmation for recipe pages: "This removes the page, not the recipe.")
- Tap "Order book →" or sticky footer → Print Order (12)
- Tap "Preview" → full-book PDF preview (read-only scroll)

**Empty state (new cookbook, no pages):**
- Illustrated empty state: open book SVG + stickers around it
- Headline: "Your book is empty"
- Body: "Start with a cover and add your recipes."
- Two CTA buttons: "Add a cover page" (primary) · "Add recipes from my library" (secondary)

**Error states:**
- "Order book →" tapped with no cover page: inline highlight on cover row — `Add a cover before ordering.`
- "Order book →" tapped with < 2 recipe pages: toast — `Add at least one recipe page before ordering.`
- Reorder drag fails (network): row snaps back + toast — `Couldn't save page order. Try again.`

**Navigation pattern:** Pushed from Shelves (07) or Home cookbook card. Deep linking: cookbook card in Home → Book Builder for that cookbook.

**Microcopy:**
- Screen title: `{Cookbook name}` (using cookbook title from DB)
- Progress strip: `{n} pages` · `~${price} to print`
- Preview link: `Preview`
- Order button (top bar): `Order book →`
- Order footer: `{n} pages ready — Order a printed copy →`
- Insert page sheet title: `Add a page`
- Status chips: `Done` · `Edit` · `Add content`
- Delete recipe page confirmation: `Remove this page? The recipe stays in your library.`
- Empty headline: `Your book is empty`
- Empty body: `Start with a cover, then add your recipes.`
- Empty CTA A: `Add a cover`
- Empty CTA B: `Add recipes`
- Cover missing: `Add a cover page before ordering.`

**Cleanliness notes:**
- Every page in the list has a clear status chip — user always knows what's done and what's missing
- "Order book →" is visible throughout (top bar + sticky footer) — the destination is never out of sight
- Drag handles only visible when long-press begins — don't clutter the list
- TOC page is greyed out and non-tappable (auto-generated) with label "Auto-generated · updates when you order"

---

## Screen 12 — Print Order

**Route:** `/print/[cookbookId]`

**Purpose:** The emotional and commercial climax. User is about to order a physical book for someone they love. Must feel premium, trustworthy, and simple — not like a checkout form.

**UI elements:**
- **Top bar:** back arrow · "Order a book" (Fraunces 22px)
- **Book preview card** (220×280px, centred, paper card with shadow):
  - Cover thumbnail at size
  - Cookbook title (Fraunces 16px)
  - Page count (Nunito 13px, `--inkSoft`)
- **Format selector** (segmented control, 3 options):
  - A5 Softcover · A5 Hardcover · A4 Hardcover
  - Price updates live as format changes (fetched from Lulu API)
- **Price breakdown card** (paper card):
  - Printing: $X.XX
  - Shipping: $X.XX (or "calculated at checkout")
  - Total: **$XX.XX** (Fraunces 20px bold)
  - "Prices via Lulu xPress — ships to 130+ countries" (`--inkFaint`, 12px)
- **Recipient section:**
  - "Sending to:" label (Caveat 16px)
  - Name field · Email field · Street · City · State/Region · ZIP · Country
  - "Same as my address" checkbox
- **Gift message field** (optional):
  - Caveat placeholder: "Add a personal note to include with the package… (optional)"
  - 200 char limit, char counter
- **"Place order →" primary clay button** (terracotta, full width, shows total price)
- **Below button:** padlock icon + "Secure payment · processed by Lulu xPress" (`--inkFaint`, 12px)

**User actions:**
- Tap format option → price updates
- Fill recipient fields
- "Same as my address" → auto-fills from user profile
- Tap "Place order →" → Stripe/Lulu checkout (webview or native)
- After payment: order confirmation screen (inline, replaces form):
  - Checkmark animation + "Order placed! 🎉"
  - "Lulu is printing your book. We'll email {recipient} when it ships."
  - Order number
  - "Back to my cookbook" link

**Empty / pre-fill state:**
- If user has ordered before: last used recipient pre-filled (with "Edit" link)
- If first order: all fields blank

**Error states:**
- Required field missing on order tap: first empty field border flashes, scroll to it + `Fill in {field name} to continue.`
- PDF generation fails before Lulu submit: `We couldn't generate your PDF. Try again.` (not the user's fault — retry is safe)
- Lulu API error: `Something went wrong on our end. Your card hasn't been charged. Try again in a moment.`
- Payment declined: `Your payment didn't go through. Check your card details and try again.`
- Network lost mid-order: `Lost connection. If payment was already taken, check your email for confirmation.`

**Navigation pattern:** Pushed from Book Builder (10) "Order book →". On success, replaces with order confirmation. Back is safe (no charge yet until payment step).

**Microcopy:**
- Screen title: `Order a book`
- Format options: `A5 Softcover` · `A5 Hardcover` · `A4 Hardcover`
- Price section title: `What you'll pay`
- Print line: `Printing`
- Shipping line: `Shipping`
- Total line: `Total`
- Lulu attribution: `Printed & shipped by Lulu xPress · 130+ countries`
- Recipient section: `Who is this going to?`
- Same as me: `Use my address`
- Gift message placeholder: `Add a personal note for the package… (optional)`
- Order button: `Place order · $XX.XX`
- Security note: `Secure checkout · no card details stored in the app`
- Success headline: `Order placed!`
- Success body: `Lulu is printing your book. {recipient} will get an email when it ships.`
- Back link: `Back to my cookbook`
- Retry: `Something went wrong — try again`

**Cleanliness notes:**
- Book preview at top establishes what they're buying — emotional anchor before the form
- Price breakdown card is always visible, updates live on format change — no surprises at checkout
- "Place order" button shows the total price inline — user sees cost and CTA in one element
- Security note is present but small — reassuring without being alarming
- Gift message is explicitly optional — no friction for users who skip it
- After success: don't navigate away. Replace the form content with confirmation inline — feels lighter than a new screen

---

## Navigation Map (critical path)

```
Install
  └── Onboarding (00, steps 1–7)
        └── Home (01)                          ← tab root
              ├── Import Recipe (03a)           ← FAB
              │     └── Create/Edit Recipe (03b)
              │           └── Canvas Editor (05a)
              │                 └── Drawing Mode (05c) [sub-panel]
              │                 └── Template Picker (05b) [sub-panel]
              ├── Shelves (07) ─────────────── ← tab
              │     └── Recipe Detail (04a/04b)
              │           └── Cook Mode (06)
              ├── Elements (08) ───────────── ← tab
              ├── Me (15) ─────────────────── ← tab
              │     ├── Plans & Pricing (16)
              │     └── Telegram Connect (13)
              └── Home cookbook card
                    └── Book Builder (10)
                          ├── Cover/Dedication/About editors (11a–d)
                          └── Print Order (12)
```

---

*Remaining screens (Library 02a/02b, Detail 04a/04b, Cook Mode 06, Drawing Mode 05c, Collections 07, My Elements 08, PDF Export 09, Book Page Editors 11a-d, Plans 16, Tablet Editor 18) to be designed in the next pass.*

---

## Screen 04c — Edit Recipe (stub spec)

**Route:** `/recipe/edit/[id]` (presented modally; reached via the ✎ pencil icon in Clean view top-right of `/recipe/[id]`).

**Status:** Live since 2026-04-25. Behavior fully documented in `FEATURES.md` §9.6. Visual UX spec deferred to next design pass — for now the screen reuses the Type tab form layout from Import a Recipe (`src/components/recipe/RecipeFormFields.tsx`).

**Critical points (do not redesign without coordination):**
- Form pre-fills once on mount via `fetchRecipe(id)`; subsequent refetches don't clobber unsaved edits.
- "Save changes" primary at the bottom; "Delete recipe" subtle terracotta-underlined link below it (typed-confirmation alert before destructive action).
- Structured ingredient amount/unit/group flattens to a single string in `name` after a save round-trip — visible text preserved, structure lost. Planned fix is post-launch (separate amount/unit fields).

---

## Screen 15 — Me tab (stub spec)

**Route:** `/(tabs)/me`

**Status:** Live since 2026-04-25. Behavior fully documented in `FEATURES.md` §7. Visual UX spec deferred — current implementation uses paper-card stack with no decorative chrome.

**Top-down stack:**
1. Greeting + email (Caveat 18px greeting, Nunito 14px email)
2. **Telegram card** — connect-state aware (Connect button OR "Connected as @handle" + "Open bot" link)
3. **Privacy card** — 4 toggle rows (PP, ToS, AI, marketing). PP/ToS read-only ✓. AI/marketing live-editable.
4. **Export your data** — terracotta-underlined link, opens share sheet with JSON file. 1/24h throttle.
5. **Delete account** — destructive-styled section, opens typed-DELETE confirmation modal.
6. **Sign out** — secondary button at the bottom.

**Future polish (post-launch):**
- Tier display ("Free" / "Premium" badge with manage-subscription link → Screen 16)
- Profile name + avatar editing
- App-wide palette picker (today only the cookbook palette is selectable — `/(tabs)/me` does not offer it)

---

## Screen 18 — Cookie / tracker consent banner (stub spec)

**Route:** Modal-style banner mounted in `app/_layout.tsx` via `<TrackingConsentBanner />`. Renders only when `trackingConsent.decided === false` (first launch).

**Status:** Live since 2026-04-25 (commit `149718d`). State persisted in MMKV via `src/lib/trackingConsent.ts`. Banner renders **before** any non-essential tracker initializes — currently no tracker SDK is wired (PostHog/Sentry deferred), so the banner is structural insurance.

**UI (one bottom-sheet):**
- Heading: "Privacy choices"
- Body: brief explanation + link to Privacy Policy.
- Primary "Accept all" (clay button, terracotta) — sets `analytics: true`, `errors: true`.
- Secondary "Reject all" — sets both to false.
- Tertiary "Customize" link — expands to per-category toggles (Analytics / Crash reports / Marketing). Each category links to a vendor list.
- Once a choice is recorded, the banner never reappears unless the user changes the selection in the Privacy card on Me tab (future polish — not surfaced today).

**Compliance notes (ePrivacy / EU):**
- Banner blocks UI on first launch but does NOT block the user from using the app — both buttons immediately dismiss.
- Per-category toggles default to OFF in "Customize" (no pre-checked).
- Reject is as easy as Accept (single tap each).
