-- P7: Decision Center — persisted decision points with user workflow state

create table if not exists public.report_decision_points (
  id uuid primary key default gen_random_uuid(),
  candidate_fingerprint text not null,
  period_from date not null,
  period_to date not null,
  compare_mode text not null,
  rule_key text not null,
  title text not null,
  summary text not null,
  rationale text not null,
  priority text not null check (priority in ('critical', 'high', 'medium', 'low')),
  category text not null check (
    category in ('economic', 'operational', 'commercial', 'inventory', 'resource', 'customer')
  ),
  trust text not null,
  evidence jsonb not null default '{}'::jsonb,
  condition_hash text not null,
  engine_version text not null,
  priority_model_version text not null,
  source_report_run_id uuid references public.report_runs (id) on delete set null,
  ai_explanation text,
  ai_status text check (ai_status in ('completed', 'unavailable')),
  quality jsonb,
  status text not null default 'new' check (
    status in ('new', 'acknowledged', 'monitoring', 'resolved', 'dismissed')
  ),
  acknowledged_by uuid references public.profiles (id) on delete set null,
  acknowledged_at timestamptz,
  monitoring_since timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  dismissed_by uuid references public.profiles (id) on delete set null,
  dismissed_at timestamptz,
  dismissed_condition_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_from, period_to, compare_mode, candidate_fingerprint)
);

create index if not exists idx_report_decision_points_period
  on public.report_decision_points (period_from desc, period_to desc, status);

create index if not exists idx_report_decision_points_fingerprint
  on public.report_decision_points (candidate_fingerprint);

comment on table public.report_decision_points is 'P7 Decision Center — generated candidates + user workflow state.';

create or replace trigger set_report_decision_points_updated_at
before update on public.report_decision_points
for each row execute function public.set_updated_at();

alter table public.report_decision_points enable row level security;

drop policy if exists cap_report_decision_points_select on public.report_decision_points;
create policy cap_report_decision_points_select on public.report_decision_points for select to authenticated
using (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') in ('read', 'write'));

drop policy if exists cap_report_decision_points_insert on public.report_decision_points;
create policy cap_report_decision_points_insert on public.report_decision_points for insert to authenticated
with check (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') in ('read', 'write'));

drop policy if exists cap_report_decision_points_update on public.report_decision_points;
create policy cap_report_decision_points_update on public.report_decision_points for update to authenticated
using (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') = 'write')
with check (public.rbac_user_page_access_level(public.rbac_auth_uid(), 'report') = 'write');

grant select, insert, update on public.report_decision_points to authenticated;
grant all on public.report_decision_points to service_role;

notify pgrst, 'reload schema';
