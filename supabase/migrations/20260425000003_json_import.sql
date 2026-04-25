-- JSON Import tab: extends two CHECK constraints to accept the new
-- 'json_import' enum value.
--
-- 1. recipes.source_type — analytics + future cleanup. JSON-imported
--    recipes are tagged so we can later filter, audit, or roll back if
--    needed. The Edge Function FORCES this value (never trusts client
--    input) so the value is always accurate.
--
-- 2. ai_jobs.job_type — quota counter. Each JSON-import call burns one
--    `json_import` quota slot regardless of how many recipes were in
--    the array. Free-tier cap = 5/month, enforced in tier.ts.

alter table public.recipes drop constraint recipes_source_type_check;
alter table public.recipes add constraint recipes_source_type_check
  check (source_type in (
    'manual',
    'url_import',
    'screenshot_import',
    'telegram_link',
    'telegram_screenshot',
    'json_import'
  ));

alter table public.ai_jobs drop constraint ai_jobs_job_type_check;
alter table public.ai_jobs add constraint ai_jobs_job_type_check
  check (job_type in ('url_extract','image_extract','pdf_extract','auto_sticker','json_import'));
