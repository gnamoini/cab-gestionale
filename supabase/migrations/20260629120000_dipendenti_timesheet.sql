-- Timesheet dipendenti: registry snapshot indipendente dagli addetti + entries giornaliere.

create table if not exists public.dipendenti_timesheet_employees (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  source_addetto_name text,
  in_settings boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_dipendenti_timesheet_employees_name_norm
  on public.dipendenti_timesheet_employees (lower(trim(display_name)));

create index if not exists idx_dipendenti_timesheet_employees_in_settings
  on public.dipendenti_timesheet_employees (in_settings, display_name);

comment on table public.dipendenti_timesheet_employees is
  'Registry snapshot dipendenti timesheet; indipendente dalla lista addetti corrente.';

create table if not exists public.dipendenti_timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  dipendente_id uuid not null references public.dipendenti_timesheet_employees (id) on delete restrict,
  work_date date not null,
  ore_ordinarie numeric(5, 2) not null default 0 check (ore_ordinarie >= 0),
  ore_straordinarie numeric(5, 2) not null default 0 check (ore_straordinarie >= 0),
  assenza boolean not null default false,
  motivo_assenza text,
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_dipendenti_timesheet_entries_dipendente_date
  on public.dipendenti_timesheet_entries (dipendente_id, work_date);

create index if not exists idx_dipendenti_timesheet_entries_work_date
  on public.dipendenti_timesheet_entries (work_date);

comment on table public.dipendenti_timesheet_entries is
  'Ore giornaliere per dipendente; persistenza indipendente da settings addetti.';

drop trigger if exists trg_dipendenti_timesheet_employees_updated_at on public.dipendenti_timesheet_employees;
create trigger trg_dipendenti_timesheet_employees_updated_at
before update on public.dipendenti_timesheet_employees
for each row execute function public.set_updated_at();

drop trigger if exists trg_dipendenti_timesheet_entries_updated_at on public.dipendenti_timesheet_entries;
create trigger trg_dipendenti_timesheet_entries_updated_at
before update on public.dipendenti_timesheet_entries
for each row execute function public.set_updated_at();

alter table public.dipendenti_timesheet_employees enable row level security;
alter table public.dipendenti_timesheet_entries enable row level security;

drop policy if exists cap_dipendenti_timesheet_employees_select on public.dipendenti_timesheet_employees;
create policy cap_dipendenti_timesheet_employees_select on public.dipendenti_timesheet_employees
for select to authenticated
using (public.rbac_module_can('dipendenti', 'read'));

drop policy if exists cap_dipendenti_timesheet_employees_insert on public.dipendenti_timesheet_employees;
create policy cap_dipendenti_timesheet_employees_insert on public.dipendenti_timesheet_employees
for insert to authenticated
with check (public.rbac_module_can('dipendenti', 'write'));

drop policy if exists cap_dipendenti_timesheet_employees_update on public.dipendenti_timesheet_employees;
create policy cap_dipendenti_timesheet_employees_update on public.dipendenti_timesheet_employees
for update to authenticated
using (public.rbac_module_can('dipendenti', 'write'))
with check (public.rbac_module_can('dipendenti', 'write'));

drop policy if exists cap_dipendenti_timesheet_entries_select on public.dipendenti_timesheet_entries;
create policy cap_dipendenti_timesheet_entries_select on public.dipendenti_timesheet_entries
for select to authenticated
using (public.rbac_module_can('dipendenti', 'read'));

drop policy if exists cap_dipendenti_timesheet_entries_insert on public.dipendenti_timesheet_entries;
create policy cap_dipendenti_timesheet_entries_insert on public.dipendenti_timesheet_entries
for insert to authenticated
with check (public.rbac_module_can('dipendenti', 'write'));

drop policy if exists cap_dipendenti_timesheet_entries_update on public.dipendenti_timesheet_entries;
create policy cap_dipendenti_timesheet_entries_update on public.dipendenti_timesheet_entries
for update to authenticated
using (public.rbac_module_can('dipendenti', 'write'))
with check (public.rbac_module_can('dipendenti', 'write'));

revoke all on table public.dipendenti_timesheet_employees from public;
revoke all on table public.dipendenti_timesheet_employees from anon;
grant select, insert, update on table public.dipendenti_timesheet_employees to authenticated;

revoke all on table public.dipendenti_timesheet_entries from public;
revoke all on table public.dipendenti_timesheet_entries from anon;
grant select, insert, update on table public.dipendenti_timesheet_entries to authenticated;

-- Estensioni RBAC modulo dipendenti
create or replace function public.rbac_resource_to_module(p_resource text)
returns text
language sql
immutable
as $$
  select case coalesce(p_resource, '')
    when 'mezzi' then 'mezzi'
    when 'lavorazioni' then 'lavorazioni'
    when 'scheda_lavorazione' then 'lavorazioni'
    when 'magazzino' then 'magazzino'
    when 'movimenti_ricambi' then 'magazzino'
    when 'documenti' then 'documenti'
    when 'preventivi' then 'preventivi'
    when 'report' then 'report'
    when 'dipendenti' then 'dipendenti'
    when 'dipendenti_timesheet_employees' then 'dipendenti'
    when 'dipendenti_timesheet_entries' then 'dipendenti'
    else null
  end;
$$;

create or replace function public.rbac_log_entita_module(p_entita text)
returns text
language sql
immutable
as $$
  select case coalesce(p_entita, '')
    when 'mezzi' then 'mezzi'
    when 'lavorazioni' then 'lavorazioni'
    when 'magazzino' then 'magazzino'
    when 'magazzino_ricambi' then 'magazzino'
    when 'preventivi' then 'preventivi'
    when 'documenti' then 'documenti'
    when 'dipendenti' then 'dipendenti'
    else null
  end;
$$;

create or replace function public.rbac_staff_has_any_module_read()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_effective_can('magazzino', 'read')
    or public.user_effective_can('preventivi', 'read')
    or public.user_effective_can('lavorazioni', 'read')
    or public.user_effective_can('mezzi', 'read')
    or public.user_effective_can('report', 'read')
    or public.user_effective_can('documenti', 'read')
    or public.user_effective_can('dipendenti', 'read');
$$;
