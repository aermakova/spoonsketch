-- Phase 8 follow-up: PDF document import via the File tab.
--
-- Extends `ai_jobs.job_type` to allow `'pdf_extract'`. The Edge Function
-- already routes PDF mode to this job type; this migration just gets the
-- CHECK constraint to accept it. Free-tier monthly cap is 20 (mirrors
-- url_extract / image_extract); enforced server-side in tier.ts.

alter table public.ai_jobs drop constraint ai_jobs_job_type_check;
alter table public.ai_jobs add constraint ai_jobs_job_type_check
  check (job_type in ('url_extract','image_extract','pdf_extract','auto_sticker'));
