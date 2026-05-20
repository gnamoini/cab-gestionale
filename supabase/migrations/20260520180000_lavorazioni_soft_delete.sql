-- Soft delete standard per lavorazioni: esclusi da UI operative e statistiche report.

begin;

alter table public.lavorazioni
  add column if not exists deleted_at timestamptz;

comment on column public.lavorazioni.deleted_at is
  'Eliminazione logica: record non visibile in liste/report se valorizzato.';

-- Indici per report e liste (solo righe attive)
create index if not exists idx_lavorazioni_active_archived_created
  on public.lavorazioni (archived, created_at desc)
  where deleted_at is null;

create index if not exists idx_lavorazioni_active_archived_uscita
  on public.lavorazioni (archived, data_uscita desc nulls last)
  where deleted_at is null;

create index if not exists idx_lavorazioni_active_deleted_at
  on public.lavorazioni (deleted_at)
  where deleted_at is not null;

-- RLS: le righe eliminate non sono leggibili (report, portale, liste)
drop policy if exists cap_lavorazioni_select on public.lavorazioni;
create policy cap_lavorazioni_select on public.lavorazioni for select to authenticated
using (deleted_at is null and public.rbac_can_read_row('lavorazioni', id));

commit;
