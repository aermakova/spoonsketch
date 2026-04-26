-- Moderation events — audit trail for every image scan run by the
-- `moderate-image` Edge Function. One row per scan, kept indefinitely
-- so we have evidence + an inbound queue if we ever need to hand-flag
-- a row for NCMEC reporting (18 U.S.C. § 2258A) or DSA Art. 16
-- notice-and-action.
--
-- Required by Apple Guideline 1.2 (UGC moderation) which requires
-- "a method for filtering objectionable material" plus an audit trail.
--
-- Rows are NEVER user-visible. RLS denies all client access; only
-- service role (Edge Functions + future ops dashboard) reads/writes.

create table public.moderation_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  bucket          text not null,
  storage_path    text not null,
  -- Outcome of the scan:
  --   'safe'      — Haiku says the image is fine; signed URL allowed
  --   'rejected'  — explicit / violent / csam-suspect / non-recipe-related
  --                 with a deletable verdict; storage object was deleted
  --   'error'     — scan failed (timeout, Haiku unavailable, parse fail);
  --                 we fail closed → upload aborted; storage object deleted
  verdict         text not null check (verdict in ('safe','rejected','error')),
  -- One of: 'explicit', 'violent', 'csam_suspect', 'unrelated_to_food',
  -- 'unclear', 'scan_failed', 'safe', 'other'. Free-text otherwise.
  reason          text,
  -- Optional: the raw text Haiku returned, capped at 1KB. For audit.
  model_response  text,
  -- Tokens used by the moderation call — feeds cost monitoring.
  tokens_used     integer,
  created_at      timestamptz not null default now()
);
create index moderation_events_user_id_created_at_idx
  on public.moderation_events(user_id, created_at desc);
create index moderation_events_verdict_created_at_idx
  on public.moderation_events(verdict, created_at desc);

-- Lock down: no client access. Service role bypasses RLS.
alter table public.moderation_events enable row level security;
-- Deliberately no SELECT/INSERT/UPDATE/DELETE policies for `authenticated`.

comment on table public.moderation_events is
  'Audit trail for moderate-image Edge Function. Service-role only.';
