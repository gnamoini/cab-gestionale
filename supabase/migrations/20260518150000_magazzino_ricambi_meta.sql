-- Campi estesi ricambio (note, categoria, compatibilità, scorta minima, fornitore alternativo) in JSONB.

alter table public.magazzino_ricambi
  add column if not exists meta jsonb not null default '{}'::jsonb;

alter table public.magazzino_ricambi
  drop constraint if exists magazzino_ricambi_meta_obj_chk;

alter table public.magazzino_ricambi
  add constraint magazzino_ricambi_meta_obj_chk check (jsonb_typeof(meta) = 'object');

create index if not exists idx_magazzino_ricambi_meta_gin on public.magazzino_ricambi using gin (meta);
