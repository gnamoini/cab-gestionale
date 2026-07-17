-- Bulk label PDF jobs: progress + structured error code (production hardening)

alter table public.label_generation_jobs
  add column if not exists progress smallint not null default 0,
  add column if not exists error_code text;

alter table public.label_generation_jobs
  drop constraint if exists label_generation_jobs_progress_chk;

alter table public.label_generation_jobs
  add constraint label_generation_jobs_progress_chk check (progress between 0 and 100);
