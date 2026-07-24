-- Mapping persistente addetto (nome settings) → dipendente timesheet.
-- KPI per-dipendente usano solo mapping confermato; fuzzy match solo UI suggerimento.

create table if not exists public.addetti_employee_mapping (
  id uuid primary key default gen_random_uuid(),
  addetto_nome text not null unique,
  employee_id uuid not null references public.dipendenti_timesheet_employees (id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  confirmed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_addetti_employee_mapping_nome_norm
  on public.addetti_employee_mapping (lower(trim(addetto_nome)));

create index if not exists idx_addetti_employee_mapping_employee
  on public.addetti_employee_mapping (employee_id);

comment on table public.addetti_employee_mapping is
  'Mapping confermato nome addetto scheda → dipendente timesheet. Vietato fuzzy match automatico nei KPI.';

drop trigger if exists trg_addetti_employee_mapping_updated_at on public.addetti_employee_mapping;
create trigger trg_addetti_employee_mapping_updated_at
before update on public.addetti_employee_mapping
for each row execute function public.set_updated_at();

alter table public.addetti_employee_mapping enable row level security;

drop policy if exists cap_addetti_employee_mapping_select on public.addetti_employee_mapping;
create policy cap_addetti_employee_mapping_select on public.addetti_employee_mapping
for select to authenticated
using (
  public.rbac_module_can('dipendenti', 'read')
  or public.rbac_module_can('lavorazioni', 'read')
);

drop policy if exists cap_addetti_employee_mapping_insert on public.addetti_employee_mapping;
create policy cap_addetti_employee_mapping_insert on public.addetti_employee_mapping
for insert to authenticated
with check (public.rbac_module_can('dipendenti', 'write'));

drop policy if exists cap_addetti_employee_mapping_update on public.addetti_employee_mapping;
create policy cap_addetti_employee_mapping_update on public.addetti_employee_mapping
for update to authenticated
using (public.rbac_module_can('dipendenti', 'write'))
with check (public.rbac_module_can('dipendenti', 'write'));

drop policy if exists cap_addetti_employee_mapping_delete on public.addetti_employee_mapping;
create policy cap_addetti_employee_mapping_delete on public.addetti_employee_mapping
for delete to authenticated
using (public.rbac_module_can('dipendenti', 'write'));
