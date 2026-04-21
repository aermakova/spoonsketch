# Spoon & Sketch — Full User Flow
> Senior UX strategy document. Maps every user journey end-to-end.
> Use this directly for product design, dev ticketing, and analytics event planning.

---

## How to read this document

Each flow uses this notation:
- `[Screen]` — a screen the user sees
- `→` — user moves forward
- `↩` — user goes back or is redirected
- `⚠` — drop-off risk
- `✦` — friction-reduction suggestion
- `📊` — analytics event to track

---

## Flow 1 — First-Time User Flow (Install → First Decorated Recipe)

This is the most important flow. A user who reaches a decorated recipe page within their first session is far more likely to return and pay.

```
[App Store / Web] — user discovers app
  ↓
  ⚠ DROP-OFF: Screenshot quality in App Store determines 60%+ of installs.
     Use the scrapbook page (not a form) as the hero screenshot.
  ✦ Primary store screenshot: finished decorated cookbook page + "Make me Sketch" label.
  ✦ Second screenshot: printed physical book. Shows the end goal.
  ✦ Third screenshot: the gift moment — "For grandma" dedication page.

[Install / First Open]
  ↓
  App checks MMKV flag `onboarding_complete` → not set → go to Onboarding

[Onboarding — Step 1: Splash]
  ↓  Tap "Get started"
  ⚠ DROP-OFF: If this screen looks generic, user taps away immediately.
  ✦ Animate 2–3 stickers floating in (spring animation) on first render.
  ✦ No sign-up wall here. Zero commitment required to continue.
  📊 Event: onboarding_started

[Onboarding — Step 2: Gift angle]
  ↓  Tap "Next" or swipe
  ⚠ DROP-OFF: "Another recipe app" reaction. Kill it immediately.
  ✦ Headline must say "cookbook" + "gift" + "printed" — all three in one sentence.
  ✦ The polaroid mockup is the proof. If it looks beautiful, user stays.

[Onboarding — Step 3: Make me Sketch demo]
  ↓  Tap "Next" or swipe
  ✦ Before/after is the most persuasive format. Left: plain recipe. Right: decorated. One tap.
  ✦ If possible, animate the stickers appearing on the "after" side (200ms stagger).
  📊 Event: onboarding_step_3_seen (users who see this step convert at higher rate — track it)

[Onboarding — Step 4: Import options]
  ↓  Tap "Next" or swipe
  ✦ Don't explain how the import works. Show the 3 icons (Telegram / URL / camera) and move on.
  ✦ This step reduces "where do I even start?" anxiety at the end of onboarding.

[Onboarding — Step 5: Intent picker]
  ↓  Tap "A gift for someone" OR "My own cookbook" → auto-advance
  ⚠ DROP-OFF: If neither option resonates, user hesitates. Two is the right number. No "other".
  ✦ "A gift for someone" should be listed first — it's the stronger hook.
  ✦ Selection immediately creates the first cookbook in local state (not DB yet — no account).
  📊 Event: onboarding_intent_selected { intent: "gift" | "personal" }

[Onboarding — Step 6: Palette picker]
  ↓  Tap a palette → tap "This looks good →"
  ✦ Pre-select Terracotta. Most users won't change it, and it's the most polished.
  ✦ The mini app preview next to each swatch is key — user sees their taste reflected immediately.
  📊 Event: onboarding_palette_selected { palette: "terracotta" | "sage" | "blush" | "cobalt" }

[Onboarding — Step 7: Sign up]
  ↓
  ⚠ DROP-OFF: This is the highest-risk moment. Account creation = commitment.
  ✦ This is step 7, not step 1. User has already invested time and made choices. Sunk cost works for you.
  ✦ Show a small preview of "your cookbook is waiting" above the form — social proof of what they've set up.
  ✦ Magic link = no password = lowest possible friction. Prioritise this over Apple/Google visually.
  ✦ "Continue with Apple" must be present (App Store requirement) but don't make it the hero option.
  📊 Event: signup_started { method: "magic_link" | "apple" | "google" }

  [Sign up — Email submitted]
    ↓  User taps "Send magic link"
    [Check inbox screen]
      - "We sent a link to {email}" + animated envelope sticker
      - "Resend" link (available after 30s)
      - "Use a different email" link
      ⚠ DROP-OFF: User doesn't check email. They tap away.
      ✦ Deep link in the magic link email opens the app directly (Universal Link on iOS).
      ✦ Email subject: "Open your Spoon & Sketch cookbook" (not "Confirm your account" — frame as value, not admin)
      ✦ Email body: shows the palette they chose + cookbook name they set in step 5.
      📊 Event: magic_link_sent
      📊 Event: magic_link_opened (from email client)

  [Magic link tapped — app opens]
    ↓
    Auth confirmed → first cookbook created in DB (from step 5 intent + step 6 palette)
    📊 Event: signup_completed { method: "magic_link" }
    → [Home screen]

[Home — first visit, empty]
  ↓
  ✦ Don't show an empty home screen. Show the cookbook shell they already created in onboarding.
  ✦ Immediate CTA: "Add your first recipe" — one big obvious action.
  ✦ Below: "Or connect your Telegram bot" — secondary path for power users.
  📊 Event: home_first_visit

[Add first recipe — user taps "Add your first recipe" or FAB]
  → [Import Recipe — 03a]
  ↓
  Three paths — all converge on Create/Edit Recipe (03b):

  PATH A: Paste URL (most likely for first recipe)
    ↓  User pastes URL → taps "Import"
    [Loading: "Reading recipe…" with spinning tomato]
    ↓  ~5–10 seconds
    [Create/Edit Recipe — pre-filled, editable]
    ⚠ DROP-OFF: If pre-fill is wrong/ugly, user loses trust.
    ✦ Pre-fill confidence: show a subtle "AI-filled · review before saving" banner at top.
    ✦ Even a 70% correct pre-fill is faster than typing. Frame it as a head start, not a finished result.
    ↓  User reviews, tweaks, taps "Save"
    📊 Event: recipe_created { source: "url_import" }

  PATH B: Upload screenshot
    ↓  User picks photo from library or takes photo
    [Loading: "Extracting recipe…"]
    → [Create/Edit Recipe — pre-filled]
    📊 Event: recipe_created { source: "screenshot_import" }

  PATH C: Type manually
    → [Create/Edit Recipe — blank]
    📊 Event: recipe_created { source: "manual" }

[Create/Edit Recipe — saved]
  ↓
  ✦ After saving, don't just go to library. Show a celebratory nudge:
     "Recipe saved! Make it beautiful? →" with mini preview of an undecorated page.
  ✦ This is the pivot moment — move user toward decoration immediately.
  📊 Event: first_recipe_saved

[Canvas Editor — first visit]
  ↓  User taps "Make it a scrapbook page →"
  ✦ On first editor open, show a guided tooltip: "Tap Make me Sketch to auto-decorate →" pointing at the button.
  ↓  User taps "Make me Sketch"
  [AI decorating: sparkle animation, ~3s]
  ↓
  [Canvas with auto-placed stickers — first "wow" moment]
  ⚠ DROP-OFF: If auto-decoration looks bad, the whole value prop collapses.
  ✦ Auto-decoration must ALWAYS look good even if the recipe data is sparse. Use fallback stickers.
  ✦ On first make-me-sketch completion: show a "Love it? Save it ✓" tooltip pointing at Save.
  📊 Event: make_me_sketch_used { first_time: true }
  📊 Event: canvas_saved (this is the "aha moment" completion event)

[First decorated recipe saved — ACTIVATION COMPLETE]
  ↓
  ✦ Show a moment of delight: brief confetti or sticker pop animation on save.
  ✦ Immediately suggest next step: "Ready to turn this into a full book?" → Book Builder CTA.
  ✦ OR if user seems exploratory: let them land back in the recipe detail (scrapbook view) to admire their work.
  📊 Event: activation_complete (this is your north-star activation event)
```

**Critical path KPIs:**
| Stage | Target conversion |
|---|---|
| Install → Onboarding started | >90% |
| Onboarding started → Sign up completed | >50% |
| Sign up → First recipe saved | >60% (Day 1) |
| First recipe saved → First canvas saved | >40% (Day 1) |
| First canvas → Returning Day 7 | >25% |

---

## Flow 2 — Returning User Flow (Day 2+)

```
[Push notification OR direct open]
  ↓
  App checks `onboarding_complete` → set → skip onboarding
  App checks valid session → valid → go to Home
  App checks valid session → expired → go to Login (see Flow 3)

[Home — returning user]
  ↓
  "Today's pick" shows a different recipe each day (random from their library, not yet cooked this week)
  ✦ If user has undecorated recipes: Today's pick banner says "This recipe has no scrapbook page yet. Decorate it →"
  ✦ If user has a book in progress: persistent nudge bar below Today's pick: "Your book is X% ready. Keep going →"

Returning user patterns (3 distinct types):

PATTERN A — The active decorator (adds recipes + decorates regularly)
  Home → tap Today's pick → detail (scrapbook view) → edit in canvas → save
  📊 Event: recipe_decorated { returning: true }

PATTERN B — The recipe collector (imports lots, rarely decorates)
  Home → FAB → Import → Create → Save → back to Home
  ⚠ RISK: This user never activates the core value prop (decoration). They churn without paying.
  ✦ After 3 undecorated recipes: "Your recipes are waiting to be beautiful" nudge with visual preview.
  ✦ Trigger "Make me Sketch" for their last added recipe automatically (with permission) and show the result.
  📊 Event: user_at_risk_no_decoration (trigger re-engagement campaign)

PATTERN C — The cook (opens app in kitchen to follow a recipe)
  Home → Today's pick / library → detail (clean view) → Cook Mode
  ✦ This user is highly retained even if they never decorate. Don't push decoration during cooking.
  📊 Event: cook_mode_started { returning: true }
```

---

## Flow 3 — Login Flow (Returning, Session Expired)

```
[App open — expired session]
  ↓
  [Login screen — not full onboarding, just auth]
  - "Welcome back" (Fraunces 26px)
  - Email input + "Send magic link" button
  - "Continue with Apple" / "Continue with Google"
  - NO: don't show onboarding again. Don't ask for palette/intent again.
  ⚠ DROP-OFF: Any friction here loses users who are trying to cook RIGHT NOW.
  ✦ If user previously used Apple Sign In, show Apple button prominently (most returning users tap this).
  ✦ If user previously used email, auto-focus email input and show their last email pre-filled.

  [Magic link path]
    ↓  User submits email
    [Check inbox state]
    ↓  User taps link in email
    → [Home — exactly where they were]
    ✦ After re-auth, return user to their last screen if possible (stored in MMKV).

  [Apple/Google path]
    ↓  One tap
    → [Home]
    📊 Event: login_completed { method: "apple" | "google" | "magic_link", returning: true }
```

---

## Flow 4 — Main Task Flow (Add Recipe → Decorate → Add to Book → Print)

This is the core product loop. Everything else exists to support this.

```
PHASE 1 — ADD A RECIPE
─────────────────────
[Home] → tap FAB (+)
  → [Import Recipe — 03a]
    ├── URL import → AI extract → [Create/Edit Recipe — pre-filled]
    ├── Screenshot → AI extract → [Create/Edit Recipe — pre-filled]
    └── Manual → [Create/Edit Recipe — blank]

[Create/Edit Recipe]
  ↓  Fill / review all fields
  ↓  Tap "Save"
  → Recipe created in DB
  📊 Event: recipe_saved { source, has_image, ingredient_count, step_count }

PHASE 2 — DECORATE THE RECIPE
──────────────────────────────
[Create/Edit Recipe] → tap "Make it a scrapbook page →"
  OR
[Recipe Detail — scrapbook view] → tap "Edit page"
  → [Canvas Editor — 05a]

[Canvas Editor]
  OPTION A — Quick: tap "Make me Sketch" → AI places stickers → review → Save
  OPTION B — Manual: tap sticker tiles to add → drag to position → Save
  OPTION C — Draw: tap Draw tab → freehand with Pencil/finger → Save

  ↓  Tap "Save page"
  → Canvas thumbnail generated (Skia makeImageSnapshot)
  → Saved to DB (recipe_canvases + canvas_elements + drawing_strokes)
  📊 Event: canvas_saved { method: "ai" | "manual" | "draw" | "mixed", element_count }

PHASE 3 — BUILD THE BOOK
─────────────────────────
[Home cookbook card] → tap → [Book Builder — 10]
  OR
[Me tab] → "My books" → [Book Builder]

[Book Builder]
  ↓  User sees page list (cover + existing recipe pages)
  ↓  Tap "Cover" → [Cover editor — 11a] → title + photo + palette → Save
  ↓  Tap "Dedication" → [Dedication editor — 11b] → write/draw personal message → Save
  ↓  Recipe pages auto-added if recipe has a canvas
  ↓  Tap + to add Chapter dividers, About page, Closing page as needed
  ↓  Review page order (drag to reorder)
  📊 Event: book_page_added { page_type }
  📊 Event: book_built { total_pages, has_cover, has_dedication }

PHASE 4 — EXPORT OR PRINT
──────────────────────────
PATH A — PDF export (free or watermarked)
  [Book Builder] → tap "Export PDF" → [PDF Export — 09]
    ↓  Choose style (scrapbook/clean) + paper size
    ↓  Tap "Export" → Edge Function generates PDF → download link
    📊 Event: pdf_exported { style, page_count, tier }

PATH B — Order a physical book (paid)
  [Book Builder] → tap "Order book →" → [Print Order — 12]
    ↓  Choose format (A5 softcover / A5 hardcover / A4 hardcover)
    ↓  Enter recipient address (or "use my address")
    ↓  Optional gift message
    ↓  Review price breakdown
    ↓  Tap "Place order · $XX.XX"
    → Payment (Stripe/Lulu checkout)
    → Order submitted to Lulu xPress API
    → Confirmation screen
    📊 Event: print_order_placed { format, price_cents, is_gift: recipient_email !== user_email }
```

---

## Flow 5 — Telegram Bot Flow (Power User Import)

```
[Settings — Telegram Connect — 13]
  ↓  Tap "Connect Telegram"
  → Deep link opens Telegram app → bot starts chat
  → Bot sends one-time auth token challenge
  → User taps "Confirm" in Telegram
  → App receives token via Supabase Realtime → connection confirmed
  → Settings screen shows "@username · Connected ✓"
  📊 Event: telegram_connected

[In Telegram — user sends recipe link]
  User: pastes URL in bot chat
  Bot: "Got it! Extracting your recipe…"
  ↓  BullMQ job → Claude Haiku extracts recipe → saves to DB
  Bot: "✓ Saved: {recipe title} · Open in app →" (deep link)
  ↓  User taps deep link → app opens to [Recipe Detail — 04a]
  📊 Event: recipe_created { source: "telegram_link" }

[In Telegram — user sends screenshot]
  User: sends photo
  Bot: "Got it! Reading this for you…"
  ↓  Haiku vision → extract → save to DB
  Bot: "✓ Saved: {recipe title} · Open in app →"
  📊 Event: recipe_created { source: "telegram_screenshot" }

  ⚠ DROP-OFF: If bot doesn't respond within 30s, user assumes it's broken and never uses it again.
  ✦ Bot must always reply immediately ("Got it! Extracting…") even if AI job hasn't started yet.
  ✦ If AI job takes > 30s: bot sends a second message ("Still working on it…").
  ✦ If AI job fails: bot sends "Couldn't read this one — try the URL or add it manually in the app." + deep link to 03a.
```

---

## Flow 6 — Notification Re-Entry Flows

### 6a — Print order shipped
```
Push: "📦 Your book is on its way! Track your Lulu order →"
  ↓  Tap notification
  → [Print Order status screen — inline in Book Builder]
  → Shows: "Shipped · Tracking: {carrier} {tracking number}" + link to carrier
  📊 Event: notification_tapped { type: "order_shipped" }
```

### 6b — Telegram recipe imported
```
Push: "📥 New recipe saved: {title} — open it →"
  ↓  Tap notification
  → [Recipe Detail — 04a (scrapbook view)] for that recipe
  ✦ If recipe has no canvas: show "Make it a scrapbook page →" banner prominently.
  📊 Event: notification_tapped { type: "telegram_recipe_imported" }
```

### 6c — Re-engagement (Day 3 inactive)
```
Push: "Your recipes are waiting to be beautiful ✨"
  ↓  Tap notification
  → [Home — with "Today's pick" highlighted and "Decorate it →" CTA on top]
  ⚠ Only send if user has ≥1 undecorated recipe AND hasn't opened app in 3 days.
  ⚠ Never send more than 1 re-engagement push per week.
  📊 Event: notification_tapped { type: "re_engagement" }
```

### 6d — Seasonal campaign (Mother's Day / Christmas / etc.)
```
Push: "Mother's Day is in 2 weeks 💐 Make her a cookbook →"
  ↓  Tap notification
  → [Home — with "Make a gift cookbook" modal floating on top]
  → Modal: "Start a new cookbook for her" → [Book Builder — new cookbook]
  ✦ Schedule seasonal pushes: Mother's Day (2 weeks before), Christmas (Dec 1 + Dec 15).
  📊 Event: notification_tapped { type: "seasonal", campaign: "mothers_day" }
```

---

## Flow 7 — Upgrade / Paywall Flow

### When the paywall appears (soft gates, not hard blocks)

| Trigger | Paywall type | Copy |
|---|---|---|
| 4th cookbook created (free limit: 3) | Modal | "You've filled your shelves. Upgrade to add unlimited cookbooks." |
| 31st recipe (free limit: 30) | Modal | "You're a dedicated cook. Upgrade for unlimited recipes." |
| PDF export attempt (free tier) | Bottom sheet | "Export without a watermark with Premium." |
| 2nd print order in a month | Modal | "You're on a roll. Upgrade for unlimited print orders." |
| 6th Make me Sketch use (free: 5/month) | Inline | "You've used all your free auto-decorations this month. Upgrade for unlimited." |
| Tap "Priority queue" in bot settings | Bottom sheet | "Get faster AI processing with Premium." |

### Paywall flow
```
[Any soft gate trigger]
  ↓
  [Upgrade sheet / modal — non-blocking]
  - Shows what they hit: "You've reached X"
  - Shows what they unlock: "With Premium you get unlimited X + Y + Z"
  - Price: "$X/month or $Y/year — save Z%"
  - Primary: "Start 7-day free trial"
  - Secondary: "Maybe later" (dismiss)
  ⚠ DROP-OFF: If paywall appears too early (before user sees value), they churn.
  ✦ Never show paywall before activation (first canvas saved). Let them reach the aha moment first.
  ✦ The paywall copy should name the specific thing they were about to do — not generic "upgrade now".
  ✦ Show the annual price as "less than a coffee a month" — $40/yr = $3.33/mo.
  📊 Event: paywall_shown { trigger, tier: "free" }

  [User taps "Start 7-day free trial"]
    ↓
    → [Plans & Pricing — 16] (full screen, shows both tiers)
    ↓  User selects monthly or annual
    → RevenueCat purchase flow (native App Store sheet on iOS)
    ↓  Purchase confirmed
    → Paywall dismissed, original action completes (e.g., PDF exports immediately)
    → Toast: "Welcome to Premium ✨"
    📊 Event: subscription_started { plan: "monthly" | "annual", trigger }

  [User taps "Maybe later"]
    ↓  Dismissed — original action blocked (or delivers watermarked version)
    📊 Event: paywall_dismissed { trigger }
    ✦ After 2nd dismissal of same paywall: show "Did you know you can get 3 months free?" offer.
```

---

## Flow 8 — Cook Mode Entry Flow

```
[Recipe Detail — clean view OR scrapbook view]
  ↓  Tap "Start cooking →"
  → [Cook Mode — 06]
  ↓  expo-keep-awake activates (screen stays on)
  ↓  User taps "Done · next step →" through each step
  ↓  Last step: button becomes "Finished! All done 🎉"
  ↓  Tap "Finished" → brief celebration moment → return to Recipe Detail
  📊 Event: cook_session_completed { recipe_id, step_count }

  ⚠ Exiting mid-recipe (home button or swipe):
    → App goes to background, keep-awake pauses
    → On return: resumes at same step (local state preserved in Zustand)
    ✦ No "are you sure?" on background — let the native app switching be invisible.
    ✦ Only ask confirmation if user taps ✕ or back explicitly.
```

---

## Flow 9 — Empty States (Zero-Data User)

These are not errors — they are opportunities to guide.

| Screen | Empty state | Suggested action |
|---|---|---|
| Home — no recipes | "Your cookbook is ready. Add your first recipe." | FAB → Import |
| Library — no recipes | "Nothing here yet. Add a recipe to start." | "Add a recipe" button |
| Library — search returns nothing | "No recipes match "{query}"." | "Clear search" link |
| Collections — no collections | "Organise recipes into collections — like Baking or Weeknight Dinners." | "+ New collection" |
| My Elements — no uploads | "Your personal sticker and photo stash lives here." | "Upload something" |
| Book Builder — empty book | "Your book is empty. Start with a cover." | "Add a cover" CTA |
| Cook Mode — no steps | "This recipe has no steps yet." | "Edit recipe" link |

---

## Drop-Off Risk Summary + Mitigations

| Stage | Risk level | Top mitigation |
|---|---|---|
| App Store screenshots → Install | 🔴 High | Use decorated scrapbook page as hero screenshot, not a form |
| Onboarding step 7 (sign up) | 🔴 High | Put sign-up LAST. Magic link. Show "your cookbook is waiting" preview above the form. |
| Magic link email → app open | 🟡 Medium | Universal/deep link so email click opens app directly. Warm email subject line. |
| Import → first recipe saved | 🟡 Medium | "AI-filled — review before saving" framing builds trust. 70% correct is fine if framed right. |
| Recipe saved → first canvas saved | 🔴 High | Always show "Make it a scrapbook page →" bar. Auto-nudge post-save. |
| First canvas → returning Day 7 | 🟡 Medium | Day 3 push notification. "Today's pick" gives a reason to open. |
| Book Builder → Print Order | 🟡 Medium | Keep "Order book →" always visible in Book Builder. Show estimated price early. |
| Print Order → payment | 🔴 High | Show price before address form. Never surprise with shipping cost at the end. |
| Telegram bot → second use | 🟡 Medium | Bot must always reply instantly ("Got it!") even if AI isn't done. |
| Free → Premium | 🟡 Medium | Never gate before aha moment. First paywall shows after activation. |

---

## Analytics Events — Full List

Track these events in order to measure each flow:

```
# Onboarding
onboarding_started
onboarding_step_3_seen
onboarding_intent_selected         { intent }
onboarding_palette_selected        { palette }
onboarding_completed

# Auth
signup_started                     { method }
signup_completed                   { method }
magic_link_sent
magic_link_opened
login_completed                    { method, returning }

# Activation
home_first_visit
recipe_created                     { source }
first_recipe_saved
make_me_sketch_used                { first_time }
canvas_saved                       { method, element_count }
activation_complete                ← north-star event

# Core loop
recipe_saved                       { source, has_image, ingredient_count, step_count }
canvas_saved                       { method, element_count }
book_page_added                    { page_type }
book_built                         { total_pages, has_cover, has_dedication }
pdf_exported                       { style, page_count, tier }
print_order_placed                 { format, price_cents, is_gift }

# Engagement
cook_mode_started                  { returning }
cook_session_completed             { recipe_id, step_count }
telegram_connected
telegram_recipe_imported

# Monetisation
paywall_shown                      { trigger, tier }
paywall_dismissed                  { trigger }
subscription_started               { plan, trigger }
subscription_renewed
subscription_cancelled             { reason, days_active }

# Notifications
notification_tapped                { type }
notification_dismissed             { type }

# Risk signals
user_at_risk_no_decoration         (3 recipes, 0 canvases, Day 3)
user_at_risk_churn                 (Day 7, no canvas saved)
```

---

## Journey Timeline — First 30 Days

```
Day 0   Install → Onboarding → Sign up → First recipe → First decorated canvas
        Target: activation_complete fires for ≥40% of installs

Day 1   Push: "Your recipe is ready to be beautiful" (if Day 0 activation incomplete)
        Re-entry: Home → canvas editor → Make me Sketch

Day 3   Push (if no Day 2 open): "Your recipes are waiting ✨"
        In-session: nudge to add a second recipe

Day 5   In-session: Book Builder discovery — "You have 3 decorated recipes. Make a book?"

Day 7   Target: 25% D7 retention
        Trigger: "Did you know you can order a printed copy?" (if no print_order_started)

Day 14  First paywall encounter (if free limits approaching)
        Target: 8–12% free-to-paid conversion within first 30 days

Day 30  Target: user has ≥5 recipes, ≥3 canvases, ≥1 book page
        Print order or PDF export likely
```

---

*This document covers all 9 user flows. Reference it alongside SCREENS.md (screen-level specs) and PLAN.md (implementation detail) when designing and building.*
