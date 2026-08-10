-- Mirror anagrafica dipendenti su registry timesheet (derivato da dipendentiRecords SSOT).
alter table public.dipendenti_timesheet_employees
  add column if not exists employee_type text not null default 'ADDETTO'
    check (employee_type in ('ADDETTO', 'ALTRO'));

alter table public.dipendenti_timesheet_employees
  add column if not exists attivo boolean not null default true;

update public.dipendenti_timesheet_employees
set employee_type = 'ADDETTO'
where employee_type is distinct from 'ADDETTO' and employee_type is distinct from 'ALTRO';

update public.dipendenti_timesheet_employees
set attivo = in_settings;

create index if not exists idx_dipendenti_timesheet_employees_type_settings
  on public.dipendenti_timesheet_employees (employee_type, in_settings, attivo);
