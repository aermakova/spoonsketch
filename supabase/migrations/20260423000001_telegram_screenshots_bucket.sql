-- Phase 8.0: Storage bucket for Telegram screenshot uploads.
--
-- The Telegram bot (deployed in Phase 8.2) downloads photo messages from
-- Telegram, uploads each to this private bucket, then hands a signed URL
-- to the `extract-recipe` Edge Function as `image_url`. Path convention:
--
--   telegram-screenshots/<user_id>/<job_id>.jpg
--
-- Bucket is private. With no `storage.objects` policies on it, Supabase RLS
-- denies all access by default — only the service-role key (the bot) can
-- write or generate signed URLs. The Edge Function fetches via that signed
-- URL, which bypasses RLS for the URL's lifetime.

insert into storage.buckets (id, name, public)
values ('telegram-screenshots', 'telegram-screenshots', false)
on conflict (id) do nothing;
