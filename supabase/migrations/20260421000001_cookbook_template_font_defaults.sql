-- ================================================================
-- Phase C: Book-level template + font defaults
-- ================================================================
-- Adds two nullable columns to public.cookbooks so users can pick a
-- default template and handwritten font per cookbook. NULL means
-- "fall back to the client default".
--
-- Per-recipe overrides live in public.recipe_canvases (template_key
-- already exists there; recipe_font added here).
-- ================================================================

alter table public.cookbooks
  add column default_template_key text
    check (default_template_key in
      ('classic','photo-hero','minimal','two-column','journal','recipe-card'));

alter table public.cookbooks
  add column default_recipe_font text
    check (default_recipe_font in ('caveat','marck','bad-script','amatic'));

alter table public.recipe_canvases
  add column recipe_font text
    check (recipe_font in ('caveat','marck','bad-script','amatic'));
