# Mobile continuation prompt

Paste the block below into a fresh Claude session (claude.ai/code on mobile Safari, connected to this repo on GitHub — or any Claude surface that can read the repo). It's self-contained.

---

```
I'm continuing work on Spoon & Sketch (repo: see current working dir / GitHub: ermakova.lina.lina's spoonsketch). Before doing anything, read these in order:

1. CLAUDE.md
2. .claude/plans/book-templates-paper-atomization.md  — the active plan
3. BUGS.md  — canonical bug register
4. MANUAL_TESTS.md  — manual regression scenarios

## State

Phase C (book-level template + font defaults) code is complete. Commits on main:
- 2922726 — Phase C + app-wide submit guard
- 37e3618 — error boundaries on all tab roots + editor save UX
- 08ac9f5 — fixed BUG-006..BUG-009 found during phone test
- 8619d16 — bug log + plan update

## Immediate task

I'm about to re-run the Phase C device test on my iPhone via Expo Go. Help me in this order:

1. **Verify the 4 just-fixed bugs.** For each of BUG-006, BUG-007, BUG-008, BUG-009 in BUGS.md:
   - Read the Repro section.
   - Walk me through the exact steps on device.
   - Tell me what the ✅ expected outcome is and what would indicate the fix regressed.
   - If a test fails, diagnose from the Expo log (I'll paste it).

2. **Note on BUG-008:** the fix only helps recipes linked to a book AFTER commit 08ac9f5. My pre-existing test recipe has cookbook_id=null and won't inherit. Either I delete+recreate it (Add page → Recipe → new), or give me the one-line Supabase SQL to backfill cookbook_id for it (I'll run it in the dashboard SQL editor).

3. **Once all 9 bugs pass re-test,** update BUGS.md to mark commit SHAs confirmed and move to Phase D — cookbook-level section titles. The plan has a full spec; start by reading it and sketch the migration + UI before writing code.

## Ground rules from CLAUDE.md you must follow

- Screens are thin; src/api/ is pure; server data in TanStack Query only, Zustand is UI-only.
- Anthropic key never in client bundle.
- TypeScript strict, no any.
- Error boundaries on every tab root and the editor (already applied via withErrorBoundary HOC).
- Only use emojis if I explicitly ask.

## How I work

- Terse updates, not essays.
- When you find a new bug on device, add a BUG-NNN row to BUGS.md using the existing entries as the template.
- When you add a new manual test scenario, put it in MANUAL_TESTS.md under the matching phase.
- Do not commit without me asking.

Start by listing the 4 bug verifications as a short checklist, then wait for me to try the first one.
```

---

## How to use from the phone

1. Copy the block inside the fenced code above.
2. On your phone, open claude.ai/code (Safari).
3. Start a new session; connect the `spoonsketch` GitHub repo if prompted.
4. Paste the prompt and send.

The fresh session won't have our conversation context, but the three docs (`plan`, `bug-log`, `manual-device-tests`) carry all the state it needs.

## When you're back at the Mac

Pick up where the mobile session left off by reading the same three docs + `git log` since `8619d16`. The bug log is the source of truth for what still needs verifying.
