-- Performance indexes + lightweight RPC aggregations (dipendenti timesheet).

begin;

create extension if not exists pg_trgm;

-- Equality filter on portale cliente (GIN tsvector does not help eq).
create index if not exists idx_mezzi_cliente_btree
  on public.mezzi (cliente);

-- Filtro priorita su liste lavorazioni attive.
create index if not exists idx_lavorazioni_priorita
  on public.lavorazioni (priorita)
  where deleted_at is null;

-- Search ilike su codice / note (leading wildcard).
create index if not exists idx_lavorazioni_codice_trgm
  on public.lavorazioni using gin (codice gin_trgm_ops)
  where codice is not null;

create index if not exists idx_lavorazioni_note_trgm
  on public.lavorazioni using gin (note gin_trgm_ops)
  where note is not null;

-- Liste filtrate per stato + archivio con ordinamento created_at.
create index if not exists idx_lavorazioni_stato_archived_created
  on public.lavorazioni (stato, archived, created_at desc)
  where deleted_at is null;

-- Storico movimenti per ricambio (report / magazzino).
create index if not exists idx_movimenti_ricambi_ricambio_created
  on public.movimenti_ricambi (ricambio_id, created_at desc);

-- Distinct month keys (YYYY-MM) senza trasferire tutte le righe entries.
create or replace function public.list_timesheet_month_keys()
returns table (month_key text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct to_char(work_date, 'YYYY-MM') as month_key
  from public.dipendenti_timesheet_entries
  where work_date is not null
  order by 1 desc;
$$;

comment on function public.list_timesheet_month_keys() is
  'Mesi (YYYY-MM) con almeno una entry timesheet; evita full scan client-side.';

-- Distinct dipendente_id con almeno una entry.
create or replace function public.list_timesheet_employee_ids_with_entries()
returns table (dipendente_id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct e.dipendente_id
  from public.dipendenti_timesheet_entries e
  where e.dipendente_id is not null
  order by 1;
$$;

comment on function public.list_timesheet_employee_ids_with_entries() is
  'ID dipendenti con almeno una presenza registrata; evita full scan client-side.';

grant execute on function public.list_timesheet_month_keys() to authenticated;
grant execute on function public.list_timesheet_employee_ids_with_entries() to authenticated;

commit;
