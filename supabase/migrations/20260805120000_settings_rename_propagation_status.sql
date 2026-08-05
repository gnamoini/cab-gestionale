-- Propagation state machine for settings rename jobs

alter table public.settings_rename_jobs
  add column if not exists propagation_status text,
  add column if not exists source text not null default 'user_rename';

update public.settings_rename_jobs
set propagation_status = case
  when execution_mode = 'configuration_only' then 'configuration_only'
  when status = 'completed' and execution_mode in ('full', 'live_propagation') then 'propagated'
  else 'pending_propagation'
end
where propagation_status is null;

alter table public.settings_rename_jobs
  alter column propagation_status set default 'pending_propagation';

alter table public.settings_rename_jobs
  drop constraint if exists settings_rename_jobs_execution_mode_chk;

alter table public.settings_rename_jobs
  add constraint settings_rename_jobs_execution_mode_chk check (
    execution_mode in ('full', 'configuration_only', 'live_propagation')
  );

alter table public.settings_rename_jobs
  drop constraint if exists settings_rename_jobs_propagation_status_chk;

alter table public.settings_rename_jobs
  add constraint settings_rename_jobs_propagation_status_chk check (
    propagation_status in ('pending_propagation', 'propagated', 'configuration_only')
  );

alter table public.settings_rename_jobs
  drop constraint if exists settings_rename_jobs_source_chk;

alter table public.settings_rename_jobs
  add constraint settings_rename_jobs_source_chk check (
    source in ('user_rename', 'repair', 'retry')
  );

alter table public.settings_rename_job_details
  add column if not exists affected_rows integer not null default 0,
  add column if not exists execution_id uuid,
  add column if not exists operation_id text;

create index if not exists idx_settings_rename_jobs_propagation_status
  on public.settings_rename_jobs (propagation_status, kind, created_at desc);

comment on column public.settings_rename_jobs.propagation_status is
  'pending_propagation | propagated | configuration_only — catalog vs operational alignment';
