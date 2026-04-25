-- Phase 8.1: One-time tokens for connecting a Telegram account.
--
-- Flow:
-- 1. App generates a row here when the user taps "Connect Telegram", returns
--    `token` to the client.
-- 2. Client opens `tg://resolve?domain=spoonsketch_bot&start=<token>`.
-- 3. Bot service receives `/start <token>`, calls the `telegram-auth` Edge
--    Function with `X-Spoon-Bot-Secret` header + the token.
-- 4. Edge Function looks up the token, marks it consumed, and inserts a
--    `telegram_connections` row mapping `user_id` → `telegram_id`.
--
-- Tokens are cryptographically random, single-use, and expire after 10
-- minutes — narrow window, can't be replayed once consumed.

create table public.telegram_auth_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  token       text not null unique,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,        -- typically created_at + 10 minutes
  consumed_at timestamptz                  -- null until the bot redeems it
);

create index telegram_auth_tokens_token_idx
  on public.telegram_auth_tokens (token);
create index telegram_auth_tokens_user_id_idx
  on public.telegram_auth_tokens (user_id);

-- RLS: a user can only INSERT tokens for themselves; nothing else from the
-- client side. The bot reads/updates via the service-role key (bypasses RLS).
alter table public.telegram_auth_tokens enable row level security;

drop policy if exists "telegram_auth_tokens_insert_own"
  on public.telegram_auth_tokens;
create policy "telegram_auth_tokens_insert_own"
  on public.telegram_auth_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

-- The client never needs to read or update tokens — the Edge Function does
-- that with service-role. Deliberately no SELECT / UPDATE / DELETE policies.

comment on table public.telegram_auth_tokens is
  'Single-use, 10-minute tokens that bind a Spoon & Sketch user to their Telegram account during the bot connect flow (Phase 8).';
