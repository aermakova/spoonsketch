# Spoon & Sketch — Marketing Brief

> **Audience:** marketing designer + copywriter producing the 4–6 onboarding "killer-feature" screens.
> **Goal:** give you everything you need in one document — positioning, audience, voice, visual system, full feature inventory, what to highlight, what NOT to promise — so you can ship the screens without re-reading the engineering docs.
> **Length:** ~7 pages. **Read top to bottom in one sitting.**

---

## 1. TL;DR

Spoon & Sketch is a cozy **scrapbook cookbook app** for millennials who want to give a beautiful, printed family cookbook as a gift. Every recipe is two layers — the practical recipe a person can cook from, and a hand-decorated scrapbook page they can frame, gift, or print into a real book. The flagship moment is **one tap** of "Make me Sketch" that decorates a plain recipe automatically. The flagship outcome is **a real, printed, hardcover cookbook** shipped to a recipient's door — entirely from inside the app.

> **The emotional anchor — quote it verbatim in deck headers if it helps:**
> *"Make Mom a cookbook for Mother's Day."*

---

## 2. The audience

### Who they are
- Millennials, 28–42, mostly women.
- Casual home cooks, not chefs. They cook 3–5x a week, save recipes from Instagram / friends / mom / random websites.
- **Gift-givers** who already buy thoughtful, handmade, personal gifts (Etsy, photo books, custom prints).
- They'll happily pay $30–$80 for a printed gift book if it looks beautiful.

### What they want
- A keepsake. Something tactile and **giftable**.
- A way to corral the recipes they already have — without typing them all in.
- The result to look **handmade and warm**, not corporate.

### What they don't want
- Another flat-design recipe app with a feed of strangers' food photos.
- A 10,000-recipe vault.
- Anything that smells like meal-prep, calorie tracking, or productivity software.

### The job they hire us for
> *"Help me make my mom a cookbook for Mother's Day in under an hour, and ship it to her so I don't have to."*

If a screen doesn't reinforce that job, cut it.

---

## 3. Brand voice — do say / don't say

**The voice:** warm · painterly · encouraging · a little handwritten · slightly nostalgic.
Think: a friend handing you a gift idea, not a tech company shipping a feature.

### ✅ Do say
- *"Make a cookbook someone will keep forever"*
- *"Beautiful with one tap"*
- *"A real, printed book, shipped to their door"*
- *"Handmade, by you"*
- *"Your recipes — finally somewhere beautiful"*
- *"For Mom. For Grandma. For the person who taught you to cook."*

### 🚫 Don't say
- *"Recipe app"* — we are a **cookbook** app, specifically a **gift** cookbook app
- *"AI-powered"* — we use AI but we never lead with it. Lead with the result.
- *"Watermark-free"* — never call attention to a free-tier limitation in onboarding
- *"Productivity"*, *"organize"*, *"manage"* — too cold
- *"Smart"*, *"intelligent"*, *"automated"* — productive-sounding
- *"Library"*, *"collection"*, *"vault"* — sterile
- *"Subscription"*, *"upgrade"*, *"plans"* — never lead with money in onboarding
- Anything in ALL CAPS

### Tone bar
If a sentence sounds like it could appear on Notion's homepage, rewrite it.
If it sounds like the inscription on a kitchen tea-towel from a small Etsy shop, you're close.

---

## 4. Visual system

**This is non-negotiable. The look is the product.** Match the prototype in tone — warm cream paper, painterly textures, hand-drawn flora, washi tape, polaroids. No flat design. No drop shadows that look like Material Design. No glassmorphism.

### Source of truth
Open these files to get pixel-true reference (HTML/CSS/JSX, viewable as text):

- `.claude/samples/spoonsketch-design/spoonandsketch/project/styles.css` — full token set
- `.claude/samples/spoonsketch-design/spoonandsketch/project/stickers.jsx` — all 16 SVG stickers
- `.claude/samples/spoonsketch-design/spoonandsketch/project/screens-core.jsx` and `screens-creative.jsx` — production screen layouts

### Palette — 4 user-selectable themes

The app ships with four palettes. Marketing screens should default to **Terracotta** (the warm, default look), but feel free to use Sage / Blush / Cobalt accents in a final "Pick your style" screen if the carousel includes one.

| Theme | Background | Paper | Accent |
|---|---|---|---|
| **Terracotta** *(default)* | `#f4ecdc` | `#faf4e6` | `#c46a4c` |
| Sage | `#eef0e4` | `#faf4e6` | `#6f8a52` |
| Blush | `#f5e7e1` | `#faf4e6` | `#c66a78` |
| Cobalt | `#e8e5dc` | `#faf4e6` | `#2f5c8f` |

### Core ink + neutral tokens
| Token | Hex | Used for |
|---|---|---|
| Ink | `#3b2a1f` | Headlines, primary text |
| Ink soft | `#6b5747` | Body text |
| Ink faint | `#a39080` | Captions, fine print |
| Line | `#e6d7bc` | Dividers, borders |

### Accent palette (use sparingly, for highlights and stickers)
Ochre `#d9a441` · Sage `#8c9f6e` · Plum `#8a5f7a` · Tomato `#b94a38` · Butter `#f2d98d` · Rose `#d97b7b`

### Fonts
| Font | Use for |
|---|---|
| **Fraunces** (Regular / Bold) | Display headlines, hero titles |
| **Caveat** (Regular / Bold) | Handwritten labels, microcopy, "for Mom" feel |
| **Nunito** (Regular / SemiBold / Bold) | Body, buttons, form text |
| Marck Script · Bad Script · Amatic SC | Optional handwriting accents |

All fonts support Cyrillic (Ukrainian release follows English).

### Texture & material vocabulary
Use these elements liberally — they ARE the brand:

- **Paper grain** — subtle SVG noise overlay on every page (opacity ~0.35, multiply blend)
- **Washi tape** — angled diagonal-stripe strips, ~0.78 opacity, off-axis rotation
- **Polaroid frames** — ivory `#fffaf0`, 10px top/sides padding, 40px bottom, soft shadow, ~+2° tilt
- **Clay buttons** — neumorphic, no border, soft inset shadow. Primary = terracotta gradient (`#d87a5c` → `#b85a3e`), light text `#fff6e8`
- **Stickers** — painterly SVG, slightly imperfect strokes, gradient fills, dark ink outline. Sit at random small rotations (-12° to +12°) like real stickers
- **Food image** — painterly placeholder (radial gradients + displacement noise), never stock photography that looks "professional"

### 16 built-in stickers (the full library)
Tomato · Lemon · Garlic · Basil · Whisk · Spoon · Pan · Wheat · Strawberry · Flower · Leaf · Heart · Star · Mushroom · Bread · Cherry

These are the visual vocabulary of every decoration. Use 3–5 of them, lightly scattered, on most screens. Don't introduce new sticker styles — match the painterly look.

---

## 5. Top 8 killer features (ranked)

Pick **4–6** of these for the onboarding carousel. We've ranked them by emotional pull. The top 4 are the strongest sells and roughly map to the gift journey: capture → decorate → personalize → ship.

| # | Feature | One-line | Why it sells | Marketing angle |
|---|---|---|---|---|
| **1** | **Make me Sketch** (auto-decoration) | One tap and your plain recipe becomes a beautifully decorated scrapbook page. | The "wow" moment. Removes the "I'm not creative enough" objection instantly. | **Before / after**, side by side. Plain recipe on the left, decorated page on the right. Headline: *"Beautiful with one tap"*. |
| **2** | **Handwritten dedication** (with Apple Pencil) | Write a personal note inside the cookbook in your own handwriting, with stickers and photos. | This is the *emotional* feature. A typed message is a card. A handwritten one is a keepsake. | A close-up of a dedication page mid-write — handwritten "For Mom" in Caveat font, a heart sticker, a polaroid. Headline: *"In your own hand."* |
| **3** | **Order a real, printed book** | Choose hardcover or softcover, type a shipping address, and we ship a physical book to their door. | Closes the loop. Without this, it's just an app. With this, it's a gift. | A photo (mockup is fine) of the printed book held in two hands. Headline: *"A real book, in their hands."* Sub: *"Hardcover. Shipped worldwide."* |
| **4** | **Freehand drawing + Apple Pencil** | Draw on any page like a real notebook — with pressure, layers, and 8 painterly colors. | The "this is mine" feature. Lets people who like to doodle express themselves. | Animated Lottie of a hand drawing a heart and a flourish around a recipe title. Or static: hand + Pencil mid-stroke. |
| **5** | **Sticker library, smartly placed** | 16 painterly food stickers — drop them by hand, or let "Make me Sketch" place them for you. | Lower-tier creativity unlock. Fast wins for non-drawers. | Show 6–8 stickers floating above a recipe page, falling into place. Headline option: *"Painted, not pixelated."* |
| **6** | **Choose your style — 4 palettes** | Terracotta, Sage, Blush, Cobalt. Pick the mood, the whole app shifts. | Personalization moment. Low effort, big perceived custom-fit. | 4 palette swatches with mini app previews — same screen, 4 vibes. |
| **7** | **Cook Mode** | Big readable steps, screen stays on, never loses your place. | Practical retention feature. Why people open the app *after* they've gifted it. | Phone propped on a kitchen counter, flour on the screen edge, big readable Step 3. |
| **8** | **Capture recipes anywhere** | Send a link to our Telegram bot, paste a URL, snap a screenshot, or type. | Removes the "I'd have to type all my recipes in" objection. | 3 small icons (link · camera · Telegram) under a single line. Don't over-explain. |

> **Recommended carousel** (4 screens): #1 Make me Sketch · #2 Handwritten dedication · #3 Printed book · #6 Palette picker as the closing setup step.
> **Or** (6 screens): add #2-#3 inserts and use #4 or #8 as a fourth content beat.

---

## 6. The onboarding contract

This section is the formal handoff between marketing and engineering. Read it carefully.

### What marketing delivers
- **4–6 killer-feature screens** — full design comps + final copy + asset exports.
- These are the **content** screens of the carousel. Engineering owns the carousel chrome (swipe, dots, skip).

### What engineering keeps (do not redesign these)
- **Step 1 — Splash hero** (logo "Spoon & Sketch", tagline, "Get started" button, "I already have an account" link).
- **Carousel infrastructure** — swipe, progress dots, "Skip" link top-right.
- **Final step — Setup picker** (intent: "A gift for someone" / "My own cookbook" + palette picker).
- **Final step — Sign up** (Sign in with Apple required by App Store; email magic link; consent toggles).

So the screens you design slot in **between** Step 1 (Splash) and the setup/sign-up steps at the end.

### Format expectations
- Figma file URL **or** PNG / SVG exports per screen
- Final copy in markdown (one block per screen — headline, body, button label, any captions)
- Animations as **Lottie** (.json) or short MP4 reference
- Source files for any custom illustrations (not just flattened PNGs)

### Aspect ratio & safe areas
- Target: **iPhone (393 × 852 logical points)**, design at 2x or 3x.
- Reserve **~50px top** and **~40px bottom** as safe areas (status bar / home indicator).
- Web/tablet versions are post-launch — design for portrait phone first.

### Process — single round-trip
1. Marketing ships a draft (Figma + copy).
2. **One** engineering review meeting (~1 hour) — we flag anything that's not feasible (e.g. a feature we don't actually have).
3. Marketing revises.
4. Engineering implements verbatim.

If you have open questions during design, append them to the bottom of this file under a `## Open questions` section — engineering will answer there.

---

## 7. Don't-promise list (these are NOT in v1)

If a screen, headline, or sub-copy implies any of the following, change it. Each one will turn into a 1-star App Store review or a refund request.

| Don't say or imply | Why |
|---|---|
| Android | iOS only at launch. Android is post-launch. |
| Family / shared cookbooks | Single-user only. No co-editing. |
| Template / sticker marketplace | All 16 stickers are built-in. No store. |
| User-uploaded sticker packs | Not in v1. |
| Social feed, public discovery, "share with the community" | Private app. No social graph. |
| Full offline mode | Works online; brief offline reads OK; no full sync. |
| Password reset / "forgot password" | Email magic link + Apple Sign In only. |
| Custom email branding for the gift recipient | Recipient does not get an email. Gift = a printed book that ships to them. |
| Calorie tracking / nutrition / meal plan | Out of scope. Not what we are. |
| "AI-generated recipes" | We help you keep the recipes you already love. We don't invent them. |
| Watermark-free / paid-tier features | Save monetization for *after* the user sees the value. |
| Any specific delivery time ("ships in 3 days") | Lulu print-on-demand timing varies by region. Don't quote numbers. |

---

## 8. App screens reference

Quick map for orientation. If a screen shows up in your design (e.g. you want to show "the editor" or "your library"), here's what each one actually looks like. **This is not a UX spec** — just so you don't accidentally reinvent something that already exists.

| Screen | Purpose | Visual anchor |
|---|---|---|
| **Onboarding (carousel)** | First-launch journey — hook, killer features, setup, sign-up | Full-bleed paper, scattered stickers, large Fraunces headlines, progress dots |
| **Sign in / Create account** | Auth (Apple + email magic link + consent toggles) | Two-tab header on paper background |
| **Home (My Cookbook)** | Daily entry point — greeting + "Today's pick" + recipe list | Hero food image, "good morning, {name}" in Caveat, recipe cards |
| **My Books (Shelves)** | All cookbooks + "All Recipes" search | Cookbook rows styled like real shelves with palette accents |
| **Cookbook (Book Builder)** | Reorderable list of pages in one cookbook (cover, dedication, recipe pages, etc.) | Editable title, page rows with thumbnail + position number, drag to reorder |
| **Add page (modal)** | 8 page types: Recipe · Cover · Dedication · Table of Contents · About · Chapter Divider · Blank · Closing | Bottom sheet with emoji + label rows |
| **Import a Recipe (modal)** | 5 tabs: Paste Link · Type · Photo · File · JSON | Tabbed modal, paper background |
| **Recipe detail — Clean view** | Read-while-cooking — hero image, ingredients, steps | Big photo, tag pills, numbered steps |
| **Recipe detail — Scrapbook view** | Decorated preview of the same recipe | A4 page mockup with washi tape + stickers + handwriting font |
| **Recipe editor (Decorate)** | Where decoration happens — Layout / Stickers / Draw modes | Canvas, mode switcher at bottom, "Make me Sketch" button in Stickers mode |
| **Cook Mode** *(planned)* | Step-by-step large-text view with screen-on | Single big step centered, "Done · next step →" button |
| **Profile (Me)** | Sign out, palette pref, consents, account deletion | Plain paper card screen |
| **Plans & Pricing (Upgrade)** *(planned)* | Free vs Premium, monthly + annual | Two pricing cards |
| **Print Order** *(planned)* | Format · address · gift message · checkout | Stepper with price summary |
| **PDF Export** *(planned)* | Style + paper size + download | Single screen with two style options |

> Anything marked *(planned)* exists in our spec docs but isn't built yet. If you reference it visually, mock it loosely — engineering will harmonize when it ships.

---

## 9. Sample copy direction (NOT a copy deck)

**You write the final copy.** These are *starting points* — the bar to clear or beat. Each block includes 1–2 anti-examples so the line is concrete.

### Feature #1 — Make me Sketch (auto-decoration)
**Sample headlines (pick one and refine):**
- *Beautiful with one tap.*
- *Plain recipes, instantly decorated.*
- *We do the styling. You take the credit.*

**Sample subcopy:**
- *Tap "Make me Sketch" — the app picks stickers that match your recipe and places them for you.*
- *No more blank-page paralysis.*

**❌ Don't write:**
- *"AI-powered auto-decoration engine"* — too engineering
- *"Smart sticker recommendations"* — too productive
- *"Automatically generate beautiful pages with one click!"* — too startup-launch

### Feature #2 — Handwritten dedication (Apple Pencil)
**Sample headlines:**
- *In your own hand.*
- *A note only you could write.*
- *For Mom. In your handwriting.*

**Sample subcopy:**
- *Write a personal dedication with Apple Pencil — handwriting, stickers, photos. Like a real letter, inside the book.*
- *The page they'll read first. The page they'll keep forever.*

**❌ Don't write:**
- *"Customize your dedication page with our digital pen tool"* — too feature-list
- *"Add personalized messages to your cookbook"* — too generic

### Feature #3 — Order a printed book
**Sample headlines:**
- *A real book, in their hands.*
- *Shipped to their door.*
- *From your phone, to their kitchen.*

**Sample subcopy:**
- *Hardcover or softcover. Printed and shipped worldwide. Type their address — we'll handle the rest.*
- *No assembly. No PDF. A real cookbook, on their shelf.*

**❌ Don't write:**
- *"PDF + print-on-demand integration"* — too engineering
- *"Premium binding options available"* — too e-commerce
- *"Express shipping in 3-5 business days"* — never quote times

---

## 10. Reference + process

### Source-of-truth files (in priority order)
| File | What it is | Read when |
|---|---|---|
| `.claude/samples/spoonsketch-design/spoonandsketch/project/styles.css` | All design tokens — palette, fonts, paper grain, washi, clay buttons, polaroid | Pulling exact hex / shadow / texture values |
| `.claude/samples/spoonsketch-design/spoonandsketch/project/stickers.jsx` | The 16 SVG stickers, painterly style | Adding sticker decoration to a screen |
| `.claude/samples/spoonsketch-design/spoonandsketch/project/screens-core.jsx` | Production screens — Welcome, Library, Create, Detail | Visual reference for what the actual app looks like |
| `.claude/samples/spoonsketch-design/spoonandsketch/project/screens-creative.jsx` | Editor, CookMode, PDF Export, Collections | Same — for the more decorative screens |
| `FEATURES.md` | The exhaustive feature inventory of what's actually built | Confirming a feature exists before you put it in copy |
| `USER_FLOW.md` (Flow 1 + Flow 4) | The gift journey — what users do, where they drop off | Understanding the *order* features land in the user's head |

### Round-trip protocol
1. Marketing produces draft → shares Figma URL with engineering.
2. Engineering reviews in a single ~1-hour meeting; flags any feasibility issues.
3. Marketing revises (one round expected, two if needed).
4. Engineering implements verbatim — no creative changes from the dev side.

### Open questions
*(append to the bottom of this file as a new `### Open questions` block. Engineering responds inline.)*

---

## Changelog
- **2026-04-24** — Initial brief drafted by engineering for the marketing handoff.
