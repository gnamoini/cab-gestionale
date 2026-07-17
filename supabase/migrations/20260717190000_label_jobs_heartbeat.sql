-- Label generation jobs: heartbeat + started_at for stuck detection (IL-005)

alter table public.label_generation_jobs
  add column if not exists heartbeat_at timestamptz,
  add column if not exists started_at timestamptz;

create index if not exists idx_label_generation_jobs_stuck
  on public.label_generation_jobs (status, heartbeat_at)
  where status in ('pending', 'running');
