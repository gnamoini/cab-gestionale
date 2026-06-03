-- Snapshot dipendente su ogni entry: storico indipendente da rename/remove addetti.

alter table public.dipendenti_timesheet_entries
  add column if not exists employee_display_name_snapshot text,
  add column if not exists employee_source_addetto_id_snapshot text;

-- Backfill da registry dipendenti
update public.dipendenti_timesheet_entries e
set
  employee_display_name_snapshot = emp.display_name,
  employee_source_addetto_id_snapshot = emp.source_addetto_id
from public.dipendenti_timesheet_employees emp
where e.dipendente_id = emp.id
  and e.employee_display_name_snapshot is null;

-- Fallback per righe orfane (non dovrebbero esistere con FK)
update public.dipendenti_timesheet_entries
set employee_display_name_snapshot = 'Dipendente sconosciuto'
where employee_display_name_snapshot is null;

alter table public.dipendenti_timesheet_entries
  alter column employee_display_name_snapshot set not null;

comment on column public.dipendenti_timesheet_entries.employee_display_name_snapshot is
  'Snapshot nome dipendente al momento del salvataggio; immutabile rispetto a rename addetti.';
comment on column public.dipendenti_timesheet_entries.employee_source_addetto_id_snapshot is
  'Snapshot id addetto da app_settings al momento del salvataggio (tracciabilità export).';

-- Policy DELETE per rimuovere righe vuote
drop policy if exists cap_dipendenti_timesheet_entries_delete on public.dipendenti_timesheet_entries;
create policy cap_dipendenti_timesheet_entries_delete on public.dipendenti_timesheet_entries
for delete to authenticated
using (public.rbac_module_can('dipendenti', 'write'));
