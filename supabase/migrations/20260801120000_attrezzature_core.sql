-- Mezzo + Attrezzature installate (V1 minimale)
-- Cliente → mezzi (telaio) → attrezzature (0..n)
-- lavorazioni.target_type + attrezzatura_id

-- ---------------------------------------------------------------------------
-- 1. Colonne telaio su mezzi
-- ---------------------------------------------------------------------------
alter table public.mezzi add column if not exists marca_telaio text;
alter table public.mezzi add column if not exists modello_telaio text;
alter table public.mezzi add column if not exists tipo_telaio text;
alter table public.mezzi add column if not exists telaio_num text;
alter table public.mezzi add column if not exists km numeric;
alter table public.mezzi add column if not exists note text;

comment on column public.mezzi.marca_telaio is 'Marca telaio/portatore (promossa da meta).';
comment on column public.mezzi.telaio_num is 'VIN / numero telaio.';

-- ---------------------------------------------------------------------------
-- 2. Tabella attrezzature
-- ---------------------------------------------------------------------------
create table if not exists public.attrezzature (
  id uuid primary key default gen_random_uuid(),
  mezzo_id uuid not null references public.mezzi (id) on delete cascade,
  marca text not null,
  modello text not null,
  tipo_attrezzatura text,
  matricola text,
  portata text,
  anno integer,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint attrezzature_marca_len check (char_length(trim(marca)) > 0),
  constraint attrezzature_modello_len check (char_length(trim(modello)) > 0),
  constraint attrezzature_anno_range check (anno is null or (anno >= 1950 and anno <= 2100))
);

drop trigger if exists attrezzature_set_updated_at on public.attrezzature;
create trigger attrezzature_set_updated_at
before update on public.attrezzature
for each row execute function public.set_updated_at();

create index if not exists idx_attrezzature_mezzo_id on public.attrezzature (mezzo_id);
create index if not exists idx_attrezzature_matricola on public.attrezzature (matricola) where matricola is not null;
create index if not exists idx_attrezzature_marca_modello on public.attrezzature (marca, modello);

-- ---------------------------------------------------------------------------
-- 3. Target intervento su lavorazioni
-- ---------------------------------------------------------------------------
alter table public.lavorazioni add column if not exists target_type text;
alter table public.lavorazioni add column if not exists attrezzatura_id uuid references public.attrezzature (id) on delete set null;

create index if not exists idx_lavorazioni_attrezzatura_id on public.lavorazioni (attrezzatura_id) where attrezzatura_id is not null;
create index if not exists idx_lavorazioni_target_type on public.lavorazioni (target_type);

-- ---------------------------------------------------------------------------
-- 4. Feature flag default (OFF)
-- ---------------------------------------------------------------------------
insert into public.app_settings (module, key, value)
values ('system', 'mezzo_attrezzature_v2', '{"enabled": false}'::jsonb)
on conflict (module, key) do nothing;
