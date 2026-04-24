-- Phase 8.4: Publish `recipes` to Supabase Realtime so the app's library
-- updates automatically when the Telegram bot inserts a new row.
--
-- Realtime is enabled by adding the table to the `supabase_realtime`
-- publication. RLS still applies to the subscription — clients only see
-- changes for rows they're allowed to SELECT.

alter publication supabase_realtime add table public.recipes;
