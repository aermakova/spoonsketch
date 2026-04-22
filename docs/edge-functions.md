# Supabase Edge Functions — dev guide

All AI calls go through Supabase Edge Functions so the Anthropic API key never
touches the client bundle. This doc covers local testing, deploying, and the
shared helpers.

## Prerequisites

- Supabase CLI: `brew install supabase/tap/supabase` (or see [install docs](https://supabase.com/docs/guides/local-development/cli/getting-started)).
- Deno: bundled with the Supabase CLI's function runtime; no separate install needed.
- A valid `ANTHROPIC_API_KEY` set as a Supabase secret (see below).

## One-time project setup

```bash
# 1. Link the local repo to the Supabase project (project_id in config.toml).
supabase link --project-ref <your-project-ref>

# 2. Set required secrets.
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set automatically by the
# Supabase platform for all deployed functions. No manual step needed.
```

## Local development

Serve a function on localhost so the iOS app can call it during dev:

```bash
supabase functions serve extract-recipe --env-file supabase/.env.local
```

For quick curl tests without JWT:

```bash
supabase functions serve extract-recipe --env-file supabase/.env.local --no-verify-jwt
```

`supabase/.env.local` is gitignored — put a sandbox `ANTHROPIC_API_KEY` there
for local runs.

Tail logs from a deployed function:

```bash
supabase functions logs extract-recipe --project-ref <ref>
```

## Deploy

```bash
supabase functions deploy extract-recipe
supabase functions deploy auto-sticker
```

The deploy bundles the `_shared/` helpers automatically (Deno resolves the
relative imports at bundle time).

## Shared helpers (`supabase/functions/_shared/`)

| File | Purpose |
|---|---|
| `cors.ts` | Standard CORS headers + preflight helper. Every function calls `handlePreflight(req)` first. |
| `errors.ts` | `jsonError(status, code, message, extra?)` and `jsonResponse(body, status?)` — all responses flow through these so the shape is consistent. |
| `auth.ts` | `requireUser(req)` → `{ userId, jwt, supabaseAdmin }` or a ready-to-return 401. Caller pattern: `if (ctx instanceof Response) return ctx;`. |
| `ai.ts` | Shared Anthropic client, `HAIKU_MODEL` constant, `logAiJob(...)` writer. |
| `tier.ts` | `getQuota(...)` + `checkQuotaAllowed(...)` for monthly cap, `checkRateLimit(...)` for per-user flood guard. Free limits live in `FREE_MONTHLY_LIMITS`. |

## Standard handler shape

```ts
import { handlePreflight } from '../_shared/cors.ts';
import { jsonError, jsonResponse } from '../_shared/errors.ts';
import { requireUser } from '../_shared/auth.ts';
import { checkQuotaAllowed, checkRateLimit, getQuota } from '../_shared/tier.ts';
import { anthropic, HAIKU_MODEL, logAiJob } from '../_shared/ai.ts';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed');

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;

  const rate = await checkRateLimit(ctx.supabaseAdmin, ctx.userId, 'url_extract');
  if (!rate.ok) {
    return jsonError(429, 'rate_limited', 'Too many requests', {
      retry_after_seconds: rate.retryAfterSeconds,
    });
  }

  const quota = await getQuota(ctx.supabaseAdmin, ctx.userId, 'url_extract');
  const capped = checkQuotaAllowed(quota);
  if (capped) return jsonError(429, capped.error, undefined, capped);

  // ... do the actual work, call Haiku, log the job, return jsonResponse.
});
```

## Secrets reference

| Secret | Where it comes from | Used by |
|---|---|---|
| `ANTHROPIC_API_KEY` | Set manually via `supabase secrets set` | `extract-recipe`, `auto-sticker` |
| `SUPABASE_URL` | Auto-injected by Supabase runtime | `auth.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase runtime | `auth.ts` |
