-- Grafici KPI salvati per utente (preferenze report, user-scoped).

create table if not exists public.report_saved_kpi_charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  config jsonb not null,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_saved_kpi_charts_name_len check (char_length(trim(name)) between 1 and 120),
  constraint report_saved_kpi_charts_config_object check (jsonb_typeof(config) = 'object')
);

create index if not exists idx_report_saved_kpi_charts_user_updated
  on public.report_saved_kpi_charts (user_id, updated_at desc);

create index if not exists idx_report_saved_kpi_charts_user_name
  on public.report_saved_kpi_charts (user_id, name);

comment on table public.report_saved_kpi_charts is
  'Configurazioni grafici KPI custom salvate per utente (JSON config versionato).';

drop trigger if exists trg_report_saved_kpi_charts_updated_at on public.report_saved_kpi_charts;
create trigger trg_report_saved_kpi_charts_updated_at
before update on public.report_saved_kpi_charts
for each row execute function public.set_updated_at();

alter table public.report_saved_kpi_charts enable row level security;

drop policy if exists cap_report_saved_kpi_charts_own on public.report_saved_kpi_charts;
create policy cap_report_saved_kpi_charts_own on public.report_saved_kpi_charts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.report_saved_kpi_charts from public;
revoke all on table public.report_saved_kpi_charts from anon;
grant select, insert, update, delete on table public.report_saved_kpi_charts to authenticated;
