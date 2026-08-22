-- P4: AI Business Report runs (logical report + generation versions)

create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  logical_report_key text not null,
  generation_version int not null check (generation_version > 0),
  idempotency_key text not null unique,
  report_type text not null check (report_type in ('weekly', 'monthly', 'custom')),
  period_start date not null,
  period_end date not null,
  compare_mode text not null,
  status text not null check (status in ('generating', 'completed', 'failed')),
  engine_version text not null,
  prompt_version text not null,
  report_schema_version text not null,
  content jsonb,
  provenance jsonb,
  trust_summary jsonb,
  quality jsonb,
  ai_status text not null check (ai_status in ('completed', 'unavailable')),
  error text,
  generated_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  unique (logical_report_key, generation_version)
);

create unique index if not exists idx_report_runs_one_generating
  on public.report_runs (logical_report_key)
  where status = 'generating';

create index if not exists idx_report_runs_logical_completed
  on public.report_runs (logical_report_key, generation_version desc)
  where status = 'completed';

create index if not exists idx_report_runs_period
  on public.report_runs (period_start desc, report_type);

comment on table public.report_runs is 'AI Business Report generation runs — logical report + versioned generations.';

alter table public.report_runs enable row level security;

drop policy if exists cap_report_runs_select on public.report_runs;
create policy cap_report_runs_select on public.report_runs for select to authenticated
using (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') in ('read', 'write'));

drop policy if exists cap_report_runs_insert on public.report_runs;
create policy cap_report_runs_insert on public.report_runs for insert to authenticated
with check (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') in ('read', 'write'));

drop policy if exists cap_report_runs_update on public.report_runs;
create policy cap_report_runs_update on public.report_runs for update to authenticated
using (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') = 'write')
with check (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') = 'write');

grant select, insert, update on public.report_runs to authenticated;
grant all on public.report_runs to service_role;

notify pgrst, 'reload schema';
