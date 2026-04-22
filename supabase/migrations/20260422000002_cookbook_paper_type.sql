-- ================================================================
-- Phase E: Cookbook-level paper type
-- ================================================================
-- Adds a paper_type column to public.cookbooks so users can pick the
-- page background for every recipe page in that book.
-- Values: blank (no pattern) | lined | dotted | grid.
-- NOT NULL with 'blank' default so existing rows get no pattern.
-- ================================================================

alter table public.cookbooks
  add column paper_type text not null default 'blank'
  check (paper_type in ('blank', 'lined', 'dotted', 'grid'));
