-- Idempotent: garantisce colonna soft-delete se 20260520180000 non è stata applicata.

begin;

alter table public.lavorazioni
  add column if not exists deleted_at timestamptz;

comment on column public.lavorazioni.deleted_at is
  'Eliminazione logica: record escluso da liste, report e RLS select se valorizzato.';

commit;
