-- Dati storici manuali per Report lavorazioni (layer separato, non tocca lavorazioni operative).

create table if not exists public.report_manual_entries (
  id uuid primary key default gen_random_uuid(),
  period_month date not null,
  completed_count integer not null check (completed_count >= 0),
  note text,
  created_by uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint report_manual_entries_period_month_first_day check (
    period_month = date_trunc('month', period_month::timestamp)::date
  )
);

create unique index if not exists idx_report_manual_entries_active_month
  on public.report_manual_entries (period_month)
  where deleted_at is null;

create index if not exists idx_report_manual_entries_period
  on public.report_manual_entries (period_month desc)
  where deleted_at is null;

comment on table public.report_manual_entries is
  'Conteggi manuali mensili lavorazioni completate per Report; non modifica tabella lavorazioni.';

drop trigger if exists trg_report_manual_entries_updated_at on public.report_manual_entries;
create trigger trg_report_manual_entries_updated_at
before update on public.report_manual_entries
for each row execute function public.set_updated_at();

alter table public.report_manual_entries enable row level security;

drop policy if exists cap_report_manual_entries_select on public.report_manual_entries;
create policy cap_report_manual_entries_select on public.report_manual_entries for select to authenticated
using (deleted_at is null and public.rbac_has_capability(public.rbac_auth_uid(), 'can_read_operational'));

drop policy if exists cap_report_manual_entries_insert on public.report_manual_entries;
create policy cap_report_manual_entries_insert on public.report_manual_entries for insert to authenticated
with check (
  public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
  and created_by = public.rbac_auth_uid()
);

drop policy if exists cap_report_manual_entries_update on public.report_manual_entries;
create policy cap_report_manual_entries_update on public.report_manual_entries for update to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'));

revoke all on table public.report_manual_entries from public;
revoke all on table public.report_manual_entries from anon;
grant select, insert, update on table public.report_manual_entries to authenticated;
