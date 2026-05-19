-- Mezzi: matricola opzionale, tipo attrezzatura, meta JSON per campi estesi (cantiere, telaio, ore/km).

alter table public.mezzi alter column matricola drop not null;

alter table public.mezzi drop constraint if exists mezzi_matricola_len;
alter table public.mezzi drop constraint if exists mezzi_matricola_chk;

alter table public.mezzi
  add constraint mezzi_matricola_chk check (matricola is null or char_length(trim(matricola)) > 0);

alter table public.mezzi add column if not exists tipo_attrezzatura text;
alter table public.mezzi add column if not exists meta jsonb not null default '{}'::jsonb;

comment on column public.mezzi.meta is 'Campi anagrafica estesi: cantiere, telaio, ore_lavoro, km.';

-- Operatore può eliminare mezzi (allineato a editVehicles in app).
drop policy if exists mezzi_delete_priv on public.mezzi;
create policy mezzi_delete_priv on public.mezzi for delete to authenticated
using (public.current_profile_role() in ('admin', 'operatore'));
