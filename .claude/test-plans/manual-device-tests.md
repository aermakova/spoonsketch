# Manual device test scenarios

Living document. One section per phase. Run these on a real iPhone via Expo Go + tunnel before marking a phase done on the north-star test.

## Getting on device

```bash
npx expo start --tunnel
```

Scan the QR with iPhone Camera → opens Expo Go. SDK 54 bundles Skia / Reanimated / Worklets so the app runs in Expo Go without a dev build.

---

## Phase C — Book-level template + font defaults (landed 2026-04-21)

### 1. Book default applies to recipes linked to that book
> **Linkage rule:** the book default only flows if the recipe is linked to the cookbook. A recipe gets linked when it's added as a page via Book Builder → Add page → Recipe. `addBookPage` backfills `recipes.cookbook_id` on first-add so the editor can resolve the book default.

- Shelves → create a new cookbook ("Test Book A")
- Open it → gear ⚙︎ → pick template **Journal**, font **Marck** → **Save**
- ✅ Expect: modal closes; reopening shows Journal + Marck pre-selected (persisted)
- Back to Home → create a recipe (any title, one ingredient, one step)
- Back to Shelves → open Test Book A → **Add page → Recipe → pick the new recipe**
- Tap the added page to open the editor → tap Layout
- ✅ Expect: Journal template + Marck font already selected (no prior per-recipe edit)

### 2. Per-recipe override wins over book default
- In that recipe → Layout mode → change template to **Photo Hero**, font to **Amatic** → confirm the reset alert
- Tap Done → exit editor
- Reopen the recipe
- ✅ Expect: still Photo Hero + Amatic (per-recipe override persisted server-side)

### 3. Changing book default does NOT mutate already-edited recipes
- Book Builder → gear ⚙︎ → switch default to **Classic** / **Caveat** → **Save**
- Reopen the recipe from test 2
- ✅ Expect: still Photo Hero + Amatic (per-recipe override protects it)
- Create a fresh recipe → add it as a new page in the book → open its editor
- ✅ Expect: Classic + Caveat

### 4. Survives app restart (server-authoritative hydration, not just Zustand)
- Force-kill Expo Go, relaunch, open the recipe
- ✅ Expect: same template + font as before restart

### 5. Double-submit guard (fix for the 3-cookbook bug)
- Shelves → New → type title, pick color → tap **Create** three times fast
- ✅ Expect: exactly one cookbook, spinner visible on button during save
- Swipe-delete on a cookbook → tap Delete quickly twice
- ✅ Expect: one delete, no double-error

### 6. Keyboard doesn't cover any input / list in modals or sheets
- Shelves → New → tap title field → ✅ input visible above keyboard
- Book Builder → **Add page → Recipe → Choose Recipe** → search input focuses → ✅ search field + recipe list visible above keyboard (the sheet rises with the keyboard on iOS)
- Login → tap email/password → ✅ fields visible
- Recipe create → tap any field → ✅ visible
- Editor → tap an ingredient/step to edit → ✅ the edit sheet sits above keyboard

> **Audit note:** all TextInput hosts (`login`, `recipe/create`, `CookbookFormModal`, `BlockItemEditor`, `PageTypePicker`) are now keyboard-safe. If a new screen/modal adds a TextInput, wrap it in `KeyboardAvoidingView` (behavior=`padding` on iOS), or if it's an absolute-positioned custom sheet, use the `Keyboard.addListener('keyboardWillShow/Hide')` + animated-offset pattern from `PageTypePicker.tsx`.

### 7. Editor save failure surfaces
- Turn on airplane mode → in editor, change template → confirm reset
- ✅ Expect: "Save failed" Alert appears
- Turn airplane mode off

### 8. Error boundaries don't break anything visible (passive check)
- Navigate through Home / Shelves / Elements / Profile / Book / Create Recipe
- ✅ Expect: all render normally (boundaries only fire on actual render crashes)

### If something fails
Grab the Expo terminal log for the failing step — the stack trace tells us exactly which precedence step broke.

---

## Phase D — Cookbook-level section titles (landed 2026-04-21)

### 1. Section titles flow to all six templates
- Shelves → open a cookbook → ⚙︎ → under **Section titles**, set
  - Ingredients → `Інгредієнти`
  - Method → `Спосіб приготування`
  - tap **Save**
- ✅ Expect: modal closes; reopening ⚙︎ shows the new strings pre-filled.
- Open a recipe page that's part of this book.
- In the editor, cycle through all six templates (Layout → template picker):
  - **Classic** → section heads read `Інгредієнти` / `Спосіб приготування`
  - **Photo Hero** → same
  - **Minimal** → same
  - **Two Column** → same (left col ingredients head, right col method head)
  - **Journal** → ingredients note reads `Інгредієнти:` (colon is Journal's decoration — kept intentionally)
  - **Recipe Card** → same

### 2. Clean view + share text use the cookbook labels
- Back to the recipe detail → **Clean** toggle
- ✅ Expect: `Інгредієнти` heading replaces "Ingredients"; `Спосіб приготування` heading replaces "Instructions".
- Tap **Share recipe** → preview the share sheet text.
- ✅ Expect: `Інгредієнти:` and `Спосіб приготування:` appear where "Ingredients:" / "Instructions:" used to.

### 3. Empty string falls back to default
- Book settings → clear both Ingredients + Method fields → **Save**
- ✅ Expect: modal closes; templates + Clean view render the default English `Ingredients` / `Method`.
- Reopen ⚙︎ → fields are empty (faithful to what's stored); placeholder shows the default.

### 4. Live update — no remount needed
- Open a recipe in its editor → note the current section titles.
- Without closing the editor: go back to the book (or another device/tab) → change titles → Save.
- Return to the editor page → ✅ next render picks up the new titles (TanStack invalidates `['cookbook', id]`).

### 5. Standalone recipe (no cookbook link) shows defaults
- Home → create a new recipe but **do not** add it as a page in any cookbook.
- Open the editor → ✅ section headings show the default `Ingredients` / `Method`.

### 6. Keyboard doesn't cover Ingredients/Method inputs
- Book ⚙︎ → tap Method input.
- ✅ Expect: the modal lifts ~40% of the keyboard height so the input + Save button stay visible above the keyboard.
- Dismiss the keyboard → modal settles back.

---

## Phase E — Paper type at cookbook level (not yet implemented)

_To fill in once Phase E lands. Placeholder scenarios:_

- Pick "lined" paper on book creation → all recipe pages show lined background on screen.
- Native iPhone + web (CanvasKit) both render the pattern.
- `users.paper_texture` intensity (low/medium/high) affects opacity (0.15 / 0.25 / 0.4).

---

## Phases A + B — Canvas atomization (not yet implemented)

_To fill in once A+B lands. Placeholder scenarios:_

- Every populated recipe field (title, description, pills, image, ingredients-heading, ingredients-list, method-heading, method-list, tags) renders as its own selectable block in all six templates.
- Tap selects, edge-drag resizes width, font-bump works, delete hides.
- Distinct "first look" preserved per template (Photo Hero big top image, Recipe Card accent banner, Journal photo rotation).
- Empty recipe fields don't render a block.
- `schemaVersion: 2` gate clears stale `blockOverrides` without crashing.

---

## Phase F — Print alignment contract (not yet implemented)

_To fill in once F lands. Placeholder scenarios:_

- Export test recipe to PDF → open in Preview.
- Text is selectable (vector, not raster).
- Paper lines crisp at any zoom.
- Text ↔ line alignment doesn't drift across pages.
- Run Lulu PDF validator (or at minimum: A4 size + embedded fonts + no RGB-only issues).
- Submit a test print order for one recipe.
