-- Anagrafiche Migration Engine — RenameJob persistence (RFC v4)

create table if not exists public.settings_rename_jobs (
  id uuid primary key default gen_random_uuid(),
  correlation_id uuid not null unique,
  kind text not null,
  entity_id text,
  entity_key text,
  old_label text not null,
  new_label text not null,
  plan_version integer not null default 1,
  engine_version text not null default 'rename-engine-v1',
  status text not null default 'draft',
  execution_mode text not null default 'full',
  plan_json jsonb not null,
  impact_json jsonb,
  validation_json jsonb,
  metrics_json jsonb,
  entity_snapshot jsonb,
  health_json jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  parent_job_id uuid references public.settings_rename_jobs (id),
  error_message text,
  constraint settings_rename_jobs_status_chk check (
    status in (
      'draft', 'previewed', 'validated', 'approved', 'queued',
      'running', 'completed', 'failed', 'cancelled', 'reversed'
    )
  ),
  constraint settings_rename_jobs_execution_mode_chk check (
    execution_mode in ('full', 'configuration_only')
  )
);

create index if not exists idx_settings_rename_jobs_entity_key
  on public.settings_rename_jobs (entity_key, created_at desc);

create index if not exists idx_settings_rename_jobs_kind_status
  on public.settings_rename_jobs (kind, status);

create table if not exists public.settings_rename_job_details (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.settings_rename_jobs (id) on delete cascade,
  table_name text not null,
  record_id text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index if not exists idx_settings_rename_job_details_job
  on public.settings_rename_job_details (job_id);

alter table public.settings_rename_jobs enable row level security;
alter table public.settings_rename_job_details enable row level security;

drop policy if exists settings_rename_jobs_admin_all on public.settings_rename_jobs;
create policy settings_rename_jobs_admin_all on public.settings_rename_jobs
  for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

drop policy if exists settings_rename_job_details_admin_all on public.settings_rename_job_details;
create policy settings_rename_job_details_admin_all on public.settings_rename_job_details
  for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

comment on table public.settings_rename_jobs is 'Anagrafiche Migration Engine — rename jobs governati';

-- Advisory lock helper + atomic job status bump for RPC phase
create or replace function public.execute_rename_job_start(p_job_id uuid, p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.settings_rename_jobs%rowtype;
begin
  select * into v_job from public.settings_rename_jobs where id = p_job_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'job_not_found');
  end if;
  if v_job.status not in ('approved', 'queued') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status', 'status', v_job.status);
  end if;
  update public.settings_rename_jobs
    set status = 'running', created_by = coalesce(p_actor, created_by)
    where id = p_job_id;
  return jsonb_build_object('ok', true, 'job_id', p_job_id, 'kind', v_job.kind);
end;
$$;

create or replace function public.execute_rename_job_complete(
  p_job_id uuid,
  p_metrics jsonb,
  p_health jsonb,
  p_entity_snapshot jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.settings_rename_jobs
    set
      status = 'completed',
      completed_at = now(),
      metrics_json = p_metrics,
      health_json = p_health,
      entity_snapshot = coalesce(p_entity_snapshot, entity_snapshot)
    where id = p_job_id;
  return jsonb_build_object('ok', true);
end;
$$;
