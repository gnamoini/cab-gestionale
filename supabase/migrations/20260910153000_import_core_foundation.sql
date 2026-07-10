-- Import core foundation: audit events, executions, file lifecycle extension

begin;

-- ---------------------------------------------------------------------------
-- import_files lifecycle extension
-- ---------------------------------------------------------------------------

alter table public.import_files
  drop constraint if exists import_files_status_chk;

alter table public.import_files
  add constraint import_files_status_chk check (
    status in (
      'uploaded', 'stored', 'quarantined', 'expired', 'deleted',
      'processing', 'processed', 'failed', 'cancelled'
    )
  );

-- ---------------------------------------------------------------------------
-- import_audit_events
-- ---------------------------------------------------------------------------

create table if not exists public.import_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  correlation_id uuid not null,
  import_file_id uuid references public.import_files (id) on delete set null,
  execution_id uuid,
  event_type text not null,
  severity text not null default 'info',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  constraint import_audit_events_severity_chk check (
    severity in ('info', 'warning', 'error', 'critical')
  ),
  constraint import_audit_events_payload_obj_chk check (jsonb_typeof(payload) = 'object')
);

create index if not exists idx_import_audit_events_company_created
  on public.import_audit_events (company_id, created_at desc);

create index if not exists idx_import_audit_events_correlation
  on public.import_audit_events (correlation_id);

create index if not exists idx_import_audit_events_execution
  on public.import_audit_events (execution_id)
  where execution_id is not null;

alter table public.import_audit_events enable row level security;

drop policy if exists cap_import_audit_events_select on public.import_audit_events;
create policy cap_import_audit_events_select on public.import_audit_events
for select to authenticated
using (company_id = public.rbac_user_company_id());

drop policy if exists cap_import_audit_events_insert on public.import_audit_events;
create policy cap_import_audit_events_insert on public.import_audit_events
for insert to authenticated
with check (company_id = public.rbac_user_company_id());

-- ---------------------------------------------------------------------------
-- import_executions
-- ---------------------------------------------------------------------------

create table if not exists public.import_executions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  import_file_id uuid not null references public.import_files (id) on delete cascade,
  parent_execution_id uuid references public.import_executions (id) on delete set null,
  feature text not null,
  status text not null default 'queued',
  attempt int not null default 1,
  attempt_group_id uuid not null,
  max_attempts int not null default 3,
  retry_count int not null default 0,
  next_retry_at timestamptz,
  heartbeat_at timestamptz,
  worker_id text,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms int,
  provider text,
  model_id text,
  prompt_version text,
  tokens_input int,
  tokens_output int,
  error_code text,
  correlation_id uuid not null,
  result jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_executions_status_chk check (
    status in (
      'queued', 'processing', 'ai_processing', 'needs_review',
      'ready_to_commit', 'committing', 'completed', 'failed', 'cancelled'
    )
  ),
  constraint import_executions_meta_obj_chk check (jsonb_typeof(meta) = 'object')
);

alter table public.import_audit_events
  drop constraint if exists import_audit_events_execution_id_fkey;

alter table public.import_audit_events
  add constraint import_audit_events_execution_id_fkey
  foreign key (execution_id) references public.import_executions (id) on delete set null;

create index if not exists idx_import_executions_company_file
  on public.import_executions (company_id, import_file_id, created_at desc);

create index if not exists idx_import_executions_reuse
  on public.import_executions (company_id, import_file_id, feature, status)
  where status = 'completed';

create index if not exists idx_import_executions_stuck
  on public.import_executions (status, heartbeat_at)
  where status in ('processing', 'ai_processing', 'committing');

create index if not exists idx_import_executions_queued
  on public.import_executions (status, next_retry_at, created_at)
  where status = 'queued';

alter table public.import_executions enable row level security;

drop policy if exists cap_import_executions_select on public.import_executions;
create policy cap_import_executions_select on public.import_executions
for select to authenticated
using (company_id = public.rbac_user_company_id());

drop policy if exists cap_import_executions_insert on public.import_executions;
create policy cap_import_executions_insert on public.import_executions
for insert to authenticated
with check (company_id = public.rbac_user_company_id());

drop policy if exists cap_import_executions_update on public.import_executions;
create policy cap_import_executions_update on public.import_executions
for update to authenticated
using (company_id = public.rbac_user_company_id())
with check (company_id = public.rbac_user_company_id());

drop trigger if exists trg_import_executions_updated_at on public.import_executions;
create trigger trg_import_executions_updated_at
before update on public.import_executions
for each row execute function public.set_updated_at();

commit;
