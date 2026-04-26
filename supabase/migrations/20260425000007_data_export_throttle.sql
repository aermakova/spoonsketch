-- Data export rate limit per PLAN.md §19 acceptance criteria:
-- "Repeat-export attempts within 24 h return a 'still processing /
-- please wait' message, not a duplicate run."
--
-- Simple column on users — checked + bumped by the export-user-data
-- Edge Function. No separate audit table; the column itself is the
-- timestamp record. (Granular audit could be added later if needed.)

alter table public.users
  add column if not exists last_data_export_at timestamptz;
