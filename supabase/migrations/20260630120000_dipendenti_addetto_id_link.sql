-- Collegamento registry dipendenti timesheet → id addetto settings (snapshot).

alter table public.dipendenti_timesheet_employees
  add column if not exists source_addetto_id text;

create unique index if not exists idx_dipendenti_timesheet_employees_source_addetto_id
  on public.dipendenti_timesheet_employees (source_addetto_id)
  where source_addetto_id is not null;

comment on column public.dipendenti_timesheet_employees.source_addetto_id is
  'Id stabile addetto da app_settings addettiRecords; link primario per bootstrap.';
