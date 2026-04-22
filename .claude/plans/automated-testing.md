# Plan — Automated testing strategy

Goal: stop re-running every bug's manual repro by hand. Each row in `BUGS.md` and each numbered scenario in `MANUAL_TESTS.md` should be replaced (or backed up) by code that can be run with one command.

Source of truth for *what* to assert: `FEATURES.md` (user-facing contracts) + `BUGS.md` (regressions).

---

## 1. Strategy at a glance

| Layer | What it covers | Stack | Runs where |
|---|---|---|---|
| **L1 — unit / pure** | precedence chains, reducers, block def math, submit-guard, enum validity, cache-key helpers | `jest` + `jest-expo` preset, `@testing-library/react-native` | `npm test` — node, seconds |
| **L2 — API / integration** | `src/api/*.ts` against a real Postgres (Supabase local or a CI project), mutation→invalidation wiring | same Jest runner, `@supabase/supabase-js` pointed at a test project | `npm test:api` — seconds, needs Supabase running |
| **L3 — device E2E** | keyboard-covers bugs, golden paths, iOS lifecycle, anything with Skia/Reanimated | **Maestro** (YAML flows, works with Expo Go — no dev build) | `maestro test .maestro` — minutes, needs phone or simulator |

**Explicitly not doing in v1:** Detox (requires a dev build, we're on Expo Go only), Percy/Chromatic visual regression, Playwright (no web target yet), load testing, snapshot testing of SVG output.

**Why these three and not one:** L1 catches 5 of 9 existing bugs without any device or DB. L2 catches the ones that are really about Postgres + query invalidation. L3 covers what the JS runtime literally cannot simulate: iOS keyboard, backgrounding, keychain unlock.

---

## 2. Tooling to install

Add to `package.json`:

```jsonc
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:api": "jest --config jest.api.config.js",
    "e2e": "maestro test .maestro"
  },
  "devDependencies": {
    "jest": "^29",
    "jest-expo": "~54.0.0",
    "@testing-library/react-native": "^13",
    "@testing-library/jest-native": "^5",
    "@types/jest": "^29"
  }
}
```

Config files (one-time):
- `jest.config.js` — `preset: 'jest-expo'`, mock `@shopify/react-native-skia` and `react-native-reanimated` via the preset's built-in stubs, ignore `node_modules`.
- `jest.api.config.js` — separate project that runs only `__tests__/api/**` with `testEnvironment: 'node'` and a setup file that boots Supabase client against a test project.
- Maestro: install via brew (`brew install maestro`), `.maestro/config.yaml` with `appId: host.exp.Exponent` for Expo Go.

---

## 3. File layout

```
__tests__/
  lib/
    useSubmitGuard.test.ts         cluster A
    blockDefs.test.ts              FEATURES §10 block scale range
    canvasStore.test.ts            undo/redo invariants
    templateResolver.test.ts       cluster D precedence chain
  api/
    cookbooks.test.ts              mutation→invalidate wiring
    bookPages.test.ts              cluster D FK backfill
    authLifecycle.test.ts          cluster E AppState handler
  components/
    BookSettingsModal.test.tsx     cluster F draft state + Cancel
    CookbookFormModal.test.tsx     cluster A submit-guard under tap
    ErrorBoundary.test.tsx         cluster C fallback renders
  app/
    error-boundary-coverage.test.ts   cluster C structural: every tab root wraps
.maestro/
  01-golden-signup-to-book.yml
  02-keyboard-safety.yml           cluster B
  03-phase-e-paper-type.yml
  04-backgrounded-auth.yml         cluster E
  flows/                           reusable sub-flows (login, create-recipe)
```

Naming rule: one bug cluster → one test file. One FEATURES section that's hard to test at unit layer → one Maestro flow.

---

## 4. Bug clusters (9 bugs → 6 clusters)

Each cluster becomes one test file (or one Maestro flow). The test file's top comment lists every BUG-NNN it locks in.

| Cluster | Bugs | Lives at | Layer |
|---|---|---|---|
| **A — Mutation safety** | BUG-001 double-submit, BUG-003 silent save fail, BUG-004 stale cache on rename/delete | `__tests__/lib/useSubmitGuard.test.ts` + `__tests__/api/cookbooks.test.ts` + `__tests__/components/CookbookFormModal.test.tsx` | L1 + L2 + L3 (tap speed) |
| **B — Modal keyboard safety** | BUG-002 CookbookFormModal, BUG-006 PageTypePicker | `.maestro/02-keyboard-safety.yml` | L3 only (keyboard is iOS-only behavior) |
| **C — App-shell resilience** | BUG-005 missing error boundaries on tab roots | `__tests__/app/error-boundary-coverage.test.ts` (grep-style: every route under `app/` that isn't a Redirect imports `withErrorBoundary`) | L1 |
| **D — Book↔recipe linkage + defaults** | BUG-008 addBookPage FK backfill + template/font/section-title/paper-type precedence | `__tests__/api/bookPages.test.ts` + `__tests__/lib/templateResolver.test.ts` | L1 + L2 |
| **E — iOS lifecycle** | BUG-009 SecureStore crash during lock | `__tests__/api/authLifecycle.test.ts` (mock AppState, assert `startAutoRefresh`/`stopAutoRefresh` wired) + `.maestro/04-backgrounded-auth.yml` (real background/foreground) | L1 + L3 |
| **F — Draft-state modals (Save / Cancel)** | BUG-007 no Save button, Cancel-doesn't-restore | `__tests__/components/BookSettingsModal.test.tsx` | L1 component test |

---

## 5. Feature contracts to cover from `FEATURES.md`

For each section, the testable assertions (not exhaustive — this is the prioritized list):

| FEATURES § | Contract | Layer |
|---|---|---|
| §1.7 Limits | cookbook title ≤ 40, section title ≤ 40, password ≥ 6, undo buffer 50, block scale [0.6, 1.8] step 0.1 | L1 |
| §2 Auth | email format check, password min length enforced, invalid creds surface message | L1 form + L3 flow |
| §4.2 Cookbook form | required fields, color swatch default, create button disabled while in-flight | L1 component |
| §8 Recipe create | title required, servings numeric ≥ 1, empty ingredient rows filtered | L1 form |
| §10.3 Layout precedence | recipe override > book default > built-in fallback; paper_type falls back to 'blank' when no cookbook link | L1 (`templateResolver.test.ts`) |
| §10.7 Block override reset | changing template raises confirm, accept clears overrides | L1 reducer |
| §11.2 Book settings | only one of template/font/section titles/paper changed → Save enabled; Cancel restores draft | L1 component |
| §11.3 Page list | max 1 cover per book, max 1 TOC per book, reorder persists | L2 API |
| §11.4 Add page | recipe-type add backfills `recipes.cookbook_id` only when null | L2 API (locks BUG-008) |
| §12 Page stubs | each stub route renders without a recipe context | L3 smoke |
| §13.1 Integrations wired | Supabase client initializes from env, StartAutoRefresh on active | L1 unit |

---

## 6. Execution order

Work through in this order — each step is committable on its own.

1. **Install + green baseline.** Add Jest, jest-expo, testing-library. One trivial `__tests__/smoke.test.ts` that asserts `1 + 1 === 2`. Land `npm test` → exit 0.
2. **Cluster A logic** — `useSubmitGuard.test.ts`. Fast, zero deps. Validates single-shot behavior, concurrent-call rejection.
3. **Cluster C structural** — `error-boundary-coverage.test.ts`. Reads every `app/**/*.tsx` route and asserts either `withErrorBoundary` or a Redirect. Catches future regressions when someone adds a new tab.
4. **Cluster D precedence** — `templateResolver.test.ts`. Pure-function test of the precedence chain; extract helpers from `app/editor/[recipeId].tsx` / `app/recipe/[id].tsx` as needed.
5. **Cluster F modal** — `BookSettingsModal.test.tsx`. Component test of draft/Save/Cancel. Locks BUG-007.
6. **Cluster A component** — `CookbookFormModal.test.tsx`. Tap 3× fast, assert mutation called once.
7. **Cluster D integration** — `bookPages.test.ts` against a test Supabase project. Locks BUG-008.
8. **Maestro install + first flow** — `01-golden-signup-to-book.yml`. Signup → create cookbook → create recipe → add as page → open editor → assert template correct.
9. **Cluster B Maestro** — `02-keyboard-safety.yml`. Touches every TextInput host from test #6 in the manual plan.
10. **Cluster E Maestro** — `04-backgrounded-auth.yml`. `pressKey HOME` + `launchApp` + assert no red box.
11. **Phase E Maestro** — `03-phase-e-paper-type.yml`. Paper picker → pattern renders → unlinked recipe stays blank.

After step 7: 5 of 9 bugs locked at L1/L2. After step 11: all 9.

---

## 7. Living process — new bug = new test

Update `BUGS.md` so every row has a **Test** column pointing to the file that locks it. Rule from now on:

> A bug is not "✅ Fixed" until there's a test file referenced in its row.

When a new bug is found:

1. Add the row to the summary table with `Status: 🔴 Open` and an empty Test column.
2. Write the test *first* — it should fail on current code.
3. Ship the fix — test goes green.
4. Flip status to `✅ Fixed` and fill the Test column.

Corollary: when touching `FEATURES.md`, any new contract that can be tested at L1 or L2 *should* be, in the same PR.

---

## 8. Known unknowns — audit queue

Not bugs yet, just things we don't know are correct because no one's tested them. Each becomes a test while writing its cluster.

> **High-suspicion subset (🔴 audit these first — strong chance they're real bugs today):** items 1, 4, 5, 7.
> Run a grep + code read before writing their test; if confirmed broken, log as `BUG-010+` in `BUGS.md` *before* touching code.

1. 🔴 **Precedence when cookbook_id points at a deleted cookbook.** If a user deletes a cookbook that has linked recipes, `recipes.cookbook_id` isn't cascaded by the migration. Next open of that recipe → `['cookbook', deleted_id]` query → spin or undefined render. Fix likely: `on delete set null` on the FK, or a client-side null check in the template resolver.
2. **Paper type + Two Column template.** The two-column template divides the page vertically; do the SVG `<Pattern>` tiles clip correctly at the gutter?
3. **Paper type in print export.** Documented as "blank-PDF expected" for Phase E — Phase F test asserts parity.
4. 🔴 **`addBookPage` double-insert under optimistic update.** No unique constraint on `(cookbook_id, recipe_id)` → two fast taps during optimistic update can insert twice. Sibling of BUG-001. Fix likely: DB unique index + `useSubmitGuard` on the Add button.
5. 🔴 **Section titles containing emoji overflow the 40-char cap.** `.length` on a string counts UTF-16 code units, not graphemes: `'🍅'.length === 2`. A user pastes an emoji-heavy title and the cap lets through ~20 visible characters, not 40. Fix likely: count via `Array.from(str).length` or `Intl.Segmenter`.
6. **Editor opened for a recipe whose cookbook was deleted mid-session.** Hydration path — same family as #1 but in an already-open editor.
7. 🔴 **Login with uppercase email.** Form doesn't lowercase before hitting Supabase; user signs up with `Foo@x.com`, signs in with `foo@x.com`, gets "invalid creds". Fix: trim + lowercase in the login + create-account forms.
8. **Canvas undo across template change.** Block-override reset is destructive — is it undoable?

Each gets a one-line test when its cluster is being written. If a test reveals a real bug, add it to `BUGS.md` with the next BUG-NNN.

### Proposed order when we return to this

1. Install Jest baseline (§6 step 1) — ~5 min, unblocks everything below.
2. **Audit sweep** — grep + read for items 1, 4, 5, 7 above. Each confirmed issue becomes a row in `BUGS.md` (`BUG-010`, `BUG-011`, …).
3. For each confirmed bug: write a failing test → land the fix → test goes green.
4. Work clusters A → C → D → F in §6 order.
5. Maestro install + flows 01–04.

---

## 9. What this plan deliberately does NOT include

- A CI pipeline. Solo dev; `npm test` pre-commit hook is sufficient.
- Snapshot testing. Brittle and doesn't assert behavior.
- 100% coverage target. We're locking in contracts, not gaming a metric.
- Testing the prototype HTML in `.claude/samples/`.
- Translating tests — they're code, English-only.
- Tests for the Edge Functions that don't exist yet.

---

## 10. Done definition for this plan

We close this plan when:
- `npm test` exits 0 with ≥ 20 test files covering all 6 clusters.
- `BUGS.md` Test column filled for every row; Test column added to the header.
- `.maestro/` has flows 01–04 passing on the user's iPhone.
- `FEATURES.md` has a short footer linking to this plan and saying "every limit in Appendix A is locked by a test".
