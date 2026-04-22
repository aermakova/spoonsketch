-- ================================================================
-- Phase D: Cookbook-level section titles
-- ================================================================
-- Adds a jsonb column to public.cookbooks so users can customize the
-- "Ingredients" and "Method" labels per book (e.g. translate them).
-- Shape: { ingredients: string, method: string }. NOT NULL with
-- defaults so existing rows get sensible labels automatically.
-- Empty strings at render time fall back to the English defaults.
-- ================================================================

alter table public.cookbooks
  add column section_titles jsonb not null
  default '{"ingredients":"Ingredients","method":"Method"}'::jsonb;
