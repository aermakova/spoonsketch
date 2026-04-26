-- Granular consent capture (PLAN.md §C2 — Ukraine + EU launch blocker).
-- Replaces the bundled "I agree to ToS" checkbox with FOUR separate
-- consents at sign-up: ToS+PP (required), AI processing (optional),
-- print-order address use (optional), marketing email/push (optional).
--
-- Two storage shapes:
--   `users.consent_*`        — current state, fast read, used by AI gates
--   `user_consents`          — append-only audit log, one row per change,
--                              GDPR Art. 7 / Ukraine equivalent: date +
--                              version-of-PP-at-time-of-grant retained
--
-- Sign-up path: client passes consents via
--   supabase.auth.signUp({ options: { data: { consents: {...},
--                                              pp_version: '...' } } })
-- The `handle_new_user` trigger reads `raw_user_meta_data` and writes
-- both shapes in one transaction.
--
-- Existing users (only test accounts at this point) are backfilled with
-- consent_ai=true so we don't break their experience overnight; future
-- prod users go through the explicit-consent path.

-- ─── consent columns on users ───────────────────────────────────────────
alter table public.users
  add column if not exists consent_tos boolean not null default false,
  add column if not exists consent_ai boolean not null default false,
  add column if not exists consent_print boolean not null default false,
  add column if not exists consent_marketing boolean not null default false,
  -- Version of Privacy Policy / ToS the user agreed to. Bump when
  -- documents change materially (per PLAN.md §C3 change-notification).
  add column if not exists consent_pp_version text;

-- Backfill existing rows so they keep using AI features without a
-- forced re-consent prompt. Production deployments should NOT default
-- to true — they should re-prompt on next sign-in via a banner.
update public.users
  set consent_tos = true,
      consent_ai = true,
      consent_print = false,
      consent_marketing = false,
      consent_pp_version = 'pre-launch'
  where consent_pp_version is null;

-- ─── audit log ──────────────────────────────────────────────────────────
create table if not exists public.user_consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  kind         text not null check (kind in ('tos','ai','print','marketing')),
  granted      boolean not null,
  pp_version   text,
  granted_at   timestamptz not null default now()
);
create index if not exists user_consents_user_id_kind_idx
  on public.user_consents(user_id, kind, granted_at desc);

-- Service-role only. RLS denies all `authenticated` access — clients
-- only see current state via users.consent_*.
alter table public.user_consents enable row level security;

comment on table public.user_consents is
  'GDPR Art. 7 audit log. Append-only. Service-role only.';

-- ─── extend the new-user trigger ────────────────────────────────────────
-- Reads consents from auth.users.raw_user_meta_data and writes both the
-- current-state columns and an audit row per consent kind. Falls back
-- to default-false for any missing key — defensive, never throws.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  consents jsonb := coalesce(meta->'consents', '{}'::jsonb);
  pp_version text := coalesce(meta->>'pp_version', null);
  v_tos boolean := coalesce((consents->>'tos')::boolean, false);
  v_ai boolean := coalesce((consents->>'ai')::boolean, false);
  v_print boolean := coalesce((consents->>'print')::boolean, false);
  v_marketing boolean := coalesce((consents->>'marketing')::boolean, false);
begin
  insert into public.users (
    id, email, consent_tos, consent_ai, consent_print, consent_marketing, consent_pp_version
  ) values (
    new.id, new.email, v_tos, v_ai, v_print, v_marketing, pp_version
  );

  -- Audit rows — one per consent kind, granted state at time of signup.
  insert into public.user_consents (user_id, kind, granted, pp_version)
  values
    (new.id, 'tos',       v_tos,       pp_version),
    (new.id, 'ai',        v_ai,        pp_version),
    (new.id, 'print',     v_print,     pp_version),
    (new.id, 'marketing', v_marketing, pp_version);

  return new;
end; $$;

-- Recreate the trigger to point at the updated function (idempotent).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
