-- In-app Photo + File import (Phase 8 follow-up): allow signed-in users
-- to upload to their own folder in the `telegram-screenshots` bucket.
--
-- Bot uploads bypass RLS via the service-role key, so this is purely
-- additive — bot behaviour unchanged.
--
-- Path convention is `telegram-screenshots/<user_id>/<uuid>.<ext>`. The
-- policy enforces that the first path segment matches `auth.uid()`.

-- RLS is already enabled on storage.objects by Supabase default — we can't
-- assert it again from the project DB role. Just add policies.

-- Insert: user can write to their own folder only.
drop policy if exists "telegram-screenshots app upload own"
  on storage.objects;
create policy "telegram-screenshots app upload own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'telegram-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Select: user can read their own files (e.g. to render an upload preview
-- before the Edge Function consumes the signed URL). Service-role still
-- has full read for the bot path.
drop policy if exists "telegram-screenshots app read own"
  on storage.objects;
create policy "telegram-screenshots app read own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'telegram-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Delete: user can clean up their own uploads if needed.
drop policy if exists "telegram-screenshots app delete own"
  on storage.objects;
create policy "telegram-screenshots app delete own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'telegram-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
