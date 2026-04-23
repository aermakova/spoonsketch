# Code review — Phase 5 → Phase 7

Scope: every file touched or added from Phase 5 (drawing + layers) through Phase 7 (AI features), with emphasis on the biggest-value commits in between (Phase 6 book builder, Phase A/B canvas atomization, Phase F PDF export, shelves redesign Phase 1).

Findings are grouped by severity. Every item has a **file:line** pointer and a proposed action.

---

## 🚨 Must fix (correctness / security)

### R1. XSS via `escapeAttr` in PDF renderer
**File:** `src/lib/renderRecipePage.ts:998`
**What:** `escapeAttr` only replaces `"` — it doesn't escape `&`, `<`, `>`, or `'`. It's then used inside `src="${escapeAttr(c.coverImageUrl)}"` at ~8 call sites (lines 536, 626, 738, 790, 847, 977).

**Attack:** a user with their own recipe can set `cover_image_url = 'x" onerror="<payload>' ` via any path that writes that column. On PDF render, the HTML becomes:

```html
<img src="x&quot; onerror=&quot;<payload>" alt="">
```

`&quot;` is valid HTML and decodes to `"` — that breaks out of the attribute. `expo-print` uses a WebView for rendering and JS runs there.

**Impact today:** a user can only attack themselves (RLS prevents writing other users' rows). Once any sharing / collaborative feature lands (book pages shared between users, co-editing, printable-gift flows, Lulu's PDF pipeline fetching the HTML from us) this becomes wormable.

**Fix:** make `escapeAttr` escape the full HTML-attr set:

```ts
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

Even simpler: delete `escapeAttr` entirely and use `escapeHtml` for attribute values too (same escape set is valid in both contexts). Defensive.

---

### R2. SSRF allowlist: false-positive blocks legitimate hostnames starting with `fc`/`fd`
**File:** `supabase/functions/extract-recipe/index.ts:266`
**What:** `isPrivateHost` returns `true` for any hostname starting with `fc` or `fd`, intending to cover IPv6 ULA prefixes. But it runs before the IPv4 regex check and has no "is this an IPv6 literal?" guard.

So `fc-support.com`, `fdanational.com`, `fcc.gov`, etc. all get rejected as "Private or local hosts are not allowed" → user sees "That doesn't look like a recipe URL".

**Fix:** only treat `fc…` / `fd…` as IPv6 when the hostname actually contains a colon or is wrapped in `[...]`:

```ts
const isIPv6Literal = h.includes(':') || (h.startsWith('[') && h.endsWith(']'));
if (isIPv6Literal && (h === '::1' || /^\[?f[cd]/.test(h))) return true;
```

Also: `fe80::` link-local and IPv4-mapped IPv6 (`::ffff:10.0.0.1`) aren't covered. Add those while you're in there.

---

### R3. `auto-sticker` has a dead ternary
**File:** `supabase/functions/auto-sticker/index.ts:234`
**What:** `return picks.length >= MIN_STICKERS ? picks : picks;` — both branches identical. The comment on the line says the intent is "pass through even if <MIN". The ternary should be removed or the intent enforced.

**Fix (pick one):**
- If the comment is the real intent: `return picks;` (and delete the comment; the code speaks for itself once the ternary is gone).
- If the intent is to reject when too few: `return picks.length >= MIN_STICKERS ? picks : [];`

The current code works correctly by accident but makes the next reader pause.

---

### R4. URL state lost when switching tabs — contradicts Phase 7.1 manual test #8
**File:** `src/components/import/PasteLinkTab.tsx:29`, `src/components/import/TypeTab.tsx`, `app/recipe/import.tsx`
**What:** `PasteLinkTab` holds `url`, `inlineError`, `capped` in local `useState`. The parent `import.tsx` switches tabs via conditional rendering (`activeTab === 'paste' ? <PasteLinkTab /> : null`), so switching to Type unmounts the tab and its state dies.

`MANUAL_TESTS.md § Phase 7.1 #8` explicitly tests: *"Paste Link → paste a URL but don't submit → switch to Type → ✅ URL still present"*. With the current code this fails.

**Fix (cheapest):** lift `url`, `inlineError`, `capped` to the `ImportRecipeScreen` parent and pass them as props.

**Alternative:** render both tabs inside a single parent and hide with `display: 'none'` instead of unmounting. Uglier; prefer lifting state.

---

## ⚠️ Should fix (quality / rule violations)

### R5. `fetchCookbooksWithCounts` uses `: any`
**File:** `src/api/cookbooks.ts:27`
**What:** violates CLAUDE.md rule #5 ("TypeScript strict, always. No `any`"). Raw Supabase response should be typed via the generated `Database` types or a hand-written `CookbookRowWithPages` type.

```ts
return (data ?? []).map((c: any) => { ... });
```

**Fix:** define a local row type:

```ts
type CookbookRowWithPages = Cookbook & { book_pages: Array<{ page_type: string }> | null };
return (data as CookbookRowWithPages[] | null ?? []).map((c) => { ... });
```

---

### R6. Sticky paywall state in `MakeMeSketchButton`
**File:** `src/components/canvas/MakeMeSketchButton.tsx:36`
**What:** once `status = { kind: 'paywall' }`, the button stays disabled until the component unmounts. There's no path to clear it — switching modes and coming back resets state (component remounts), but staying in Stickers mode leaves the user staring at the paywall card with no "dismiss" or "retry" affordance.

**Impact:** the first call of the month that hits the cap locks that user out of the button for the remainder of the editor session. No data loss, just UX drag.

**Fix (cheap):** add a tiny × on the paywall card that sets `status = { kind: 'none' }`. Also reset status whenever `recipeId` changes.

---

### R7. Ingredient structure flattened during import
**File:** `src/components/import/TypeTab.tsx:322` (`joinIngredient`)
**What:** when an extracted recipe flows into the Type tab, `{ name: 'tomatoes', amount: '800', unit: 'g' }` becomes one string `"800 g tomatoes"`. The Type tab then splits lines on `\n` and re-parses each as `{ name: '800 g tomatoes', amount: '', unit: '' }`. The structured fields are permanently lost.

**Impact:** future features that depend on structured amounts (unit conversion, shopping-list, nutrition lookup) won't have them for imported recipes. Today, no feature cares.

**Fix:** thread the structured ingredients straight through — either:
- Store them as JSON in a new form state field and reconstruct on save.
- Or skip the Type-tab review step when Haiku returned high-confidence structured data.

Deferrable; flag and move on.

---

### R8. `getUserTier` + `checkRateLimit` fail-open on DB errors
**Files:** `supabase/functions/_shared/tier.ts:26`, `:118`
**What:** both return the "more permissive" value when the underlying DB call errors:
- `getUserTier` → returns `'free'` (then `getQuota` uses the free limit — conservative for quotas, but lets a premium user hit the cap during an outage)
- `checkRateLimit` → returns `{ ok: true }` (lets calls through during an outage — could enable brief spam)

**Trade-off:** fail-open on rate limiting is normally wrong; we accept it here because the alternative ("deny everything when DB is unreachable") means the whole feature breaks on a Supabase blip. But the silent `error || !data` branching mixes "DB error" with "no rows yet" — we can't tell which happened in logs.

**Fix (low churn):** separate the two cases. On real errors, `console.error` so the problem is visible in function logs. Keep the fail-open behavior but don't silently swallow.

---

### R9. `getQuota` computes `now` twice → tiny UTC-midnight race
**File:** `supabase/functions/_shared/tier.ts:47, 68`
**What:** `startOfMonthUtc(new Date())` and `startOfNextMonthUtc(new Date())` each call `new Date()` — if the two calls straddle UTC midnight, the response's `resetAt` is inconsistent with the `used` count's month window.

**Fix:** `const now = new Date();` once, pass it to both helpers. One-line change.

---

### R10. Quota counter race on concurrent requests
**Files:** `supabase/functions/extract-recipe/index.ts:71`, `auto-sticker/index.ts:77`
**What:** `getQuota` reads `COUNT(*)`, then the handler fires the Haiku call, then logs an `ai_jobs` row. If two parallel requests both read the count before either has written a row, both pass the cap check → the user exceeds the limit by the concurrency factor.

Worst case per user: `(concurrent_requests - 1)` over the cap. In practice capped by the 10s rate limit so it's `(very low) × 20 = ~20 extra calls/year` for the most aggressive user. Not worth fixing for MVP; mention it.

**Fix (when we care):** atomic check-and-reserve in a Postgres function that does `INSERT INTO ai_jobs` and returns the new row count in the same transaction, rolling back if over cap.

---

### R11. Recipe description sent to Haiku unbounded
**File:** `supabase/functions/auto-sticker/index.ts:175` (`buildRecipeSummary`)
**What:** `bits.push('Description: ${recipe.description}')` — `recipe.description` is an unbounded `text` column. A malicious or accidentally-verbose user could OOM the prompt or trigger Anthropic's input-token limits.

**Fix:** cap at something sane: `recipe.description.slice(0, 500)`. Same for title (`slice(0, 200)`). Prompt injection is already constrained by the VALID_STICKER_KEYS whitelist downstream, so there's no semantic risk — just a token-budget safety belt.

---

### R12. Shelves screen is 655 lines (rule #1 nudge)
**File:** `app/(tabs)/shelves.tsx`
**What:** CLAUDE.md rule #1 says "Screens are thin. Screen files import hooks and render components. Zero business logic." Shelves has:
- The `CookbookFormModal` component inline (~90 lines).
- `gridRows` + `shelfRows` packing logic inline (~30 lines).
- Mutation wiring for create/update/delete cookbooks (~30 lines).

**Fix:** extract `CookbookFormModal` to `src/components/shelves/CookbookFormModal.tsx`. Move `shelfRows` packing into a small pure helper. The mutation hooks can stay in the screen — they are screen-specific glue. Net: the file drops to ~400 lines and is much easier to scan.

---

## 💡 Nice-to-have (design notes, deferrable)

### R13. Editor useEffect deps exhaustively disabled
**File:** `app/editor/[recipeId].tsx:104`
**What:** `// eslint-disable-next-line react-hooks/exhaustive-deps` on the `useEffect` that calls `init(recipeId)` + `initDrawing(recipeId)`. Zustand actions are stable references so this is correct, but relying on the rule being silently waived means a future Zustand migration (e.g. to slices with dynamic bindings) could break this without warning.

**Fix (cheap):** pull the actions via `useCanvasStore((s) => s.init)` / `useDrawingStore((s) => s.init)` so the dep array can be honest and lint-clean.

---

### R14. `Asset.fromModule` creates a new client per Edge Function request
**File:** `supabase/functions/_shared/auth.ts:36`
**What:** every `requireUser` invocation calls `createClient(...)` for the admin client. Deno's `createClient` is cheap but not free. Over 1000 req/day this is ~5s of pointless work/day.

**Fix (cheap):** hoist to module scope:

```ts
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
```

Return `supabaseAdmin` from `requireUser` the same way. Note: the env-check in the function body was also running per-call; hoisting it to module init makes startup fail fast on misconfigured projects, which is the right failure mode.

---

### R15. Runtime shape validation missing for AI responses
**File:** `src/api/ai.ts:51, 114`
**What:** `return data as ExtractedRecipe` and `return data as AutoStickerResponse` trust the server implicitly. If the Edge Function has a bug and returns `{}`, the TypeScript type says it's a full recipe but at runtime you'll render an empty form with no title field. TanStack Query won't throw, so the user sees silent empty data.

**Fix (when we're less scrappy):** a minimal zod schema per response type, validate in the api layer, throw on mismatch. ~20 lines total, catches the whole class of bugs.

---

### R16. Every keystroke in `TypeTab` re-renders the whole form
**File:** `src/components/import/TypeTab.tsx:83`
**What:** `update()` calls `onChange({ ...values, [key]: value })`. The parent's `setTypeForm(next)` re-renders `<TypeTab>`; every `<TextInput>` gets new props (via `values.title`, `values.description`, etc.) and re-renders. On low-end iPhones or after a long form is filled, this causes perceptible keyboard lag.

**Fix:** move form state back into `TypeTab` as uncontrolled, expose an imperative `setValues` via `useImperativeHandle` for the import-success auto-fill, OR memoise per-field components so they only re-render when their specific string changes.

Not urgent on iPhone 12+; flag for when device testing hits a slower device.

---

### R17. Stale closure on `canvasWidth` / `canvasHeight` in `MakeMeSketchButton`
**File:** `src/components/canvas/MakeMeSketchButton.tsx:57`
**What:** if the user rotates device or the orientation changes during the 2-3s AI call, stickers land using the stale dimensions. The canvas re-renders at the new size; stickers plotted with old coords land off-canvas or clustered.

**Likelihood:** low on a recipe editor that's portrait-locked on iPhone. Worth mentioning.

**Fix:** read dimensions fresh via a ref or via the canvas store. Or just portrait-lock the editor (probably the right call).

---

### R18. `safeJsonParse` greedy brace extraction
**File:** `supabase/functions/extract-recipe/index.ts:394`
**What:** the fallback `trimmed.slice(first, last + 1)` between the first `{` and last `}` will produce malformed JSON for certain Haiku responses (e.g. `{... } some prose { other }`). Malformed parse returns `null` → we return 206 partial. That's fine — just note this is by-design fall-through.

No fix needed; documented here so future readers don't "fix" it into something broken.

---

### R19. Emojis still live in the Shelves screen + tab bar
**Files:** `app/(tabs)/shelves.tsx:311, 325, 335, 602`, `app/(tabs)/_layout.tsx:77,83,95,101`
**What:** `📖 🔍 ✕ ♥ 🏠 📚 ✦ 👤` — all string literals in `<Text>`. Tracked under the deferred "Option A — tab bar icon swap" from the Phase 7 plan. Mentioning for completeness: they should all go to Feather icons when that sub-phase lands.

Non-blocking.

---

### R20. Drawing rejects single-point taps
**File:** `src/lib/drawingStore.ts:188`
**What:** `commitStroke` requires `points.length >= 2`. A user tapping once (to place a "dot") gets no stroke. Intentional jitter guard; arguably the right default for a freehand tool.

Not a bug. Worth leaving a one-line comment in the code explaining the intent so nobody "fixes" it.

---

## 🟢 Things that are well done

Since corrections are the default genre of code review, worth also calling out the patterns that are *right*:

- **Per-recipe state isolation** in `canvasStore` and `drawingStore` (keyed maps + working copies) — BUG-015's original fix is solid and the migration path is clean.
- **Undo frame unification** for Make-me-Sketch (`addStickersBatch` → single `pushSnap`) — the right pattern for batched AI actions; matches the UX expectation of "undo once, they all go".
- **Server-side recipe fetch in `auto-sticker`** — correctly refuses to trust client-sent recipe content. Prevents burning our Anthropic budget on forged payloads.
- **Single source of truth for sticker keys** (the `VALID_STICKER_KEYS` whitelist downstream of Haiku output) — even if the model is coerced into returning junk, the server drops it. Good defence-in-depth.
- **`handlePreflight` + `jsonError` pattern** in `_shared/` — forces every Edge Function to the same response shape without ceremony.
- **Quota + rate-limit decomposition** — clean two-layer guard (monthly cap via counts; 10s window via last-row lookup). Works well for MVP without needing a separate rate-limiter service.
- **Shelves landing code** — the packing logic for rows + the "Add Cookbook" tile as the last slot is compact and handles the 0-cookbook case elegantly (single row with just the add tile).
- **Client-only PDF export** (`exportRecipePdf`) is genuinely clever — reuses the server-safe HTML renderer via iOS's native print dialog with zero server-side Puppeteer needed. Unblocks printing before the Lulu pipeline exists.

---

## Triage suggestions

If you only fix a few things before shipping Phase 7:
1. **R1** — XSS in escapeAttr. Real security issue, 4 lines to fix.
2. **R2** — SSRF false positive. Real user-visible bug, 4 lines to fix.
3. **R3** — dead ternary in auto-sticker. 1 line.
4. **R4** — URL state loss on tab switch. Contradicts our own test plan, ~15 lines.

Everything else can roll into a follow-up "Phase 7 polish" PR.

---

*Reviewed 2026-04-22. Scope: Phase 5 (drawing + layers) → Phase 7 (AI features) inclusive, including Phase 6 book builder, Phase A/B canvas atomization, Phase D/E cookbook-level defaults, Phase F PDF export, shelves redesign Phase 1.*
