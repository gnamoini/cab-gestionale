-- Gestionale officina — schema PostgreSQL Supabase (SQL Editor / migrazione)
-- Idempotente: rieseguibile senza errori su oggetti già presenti
-- Estensioni
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Enum (ruolo: vedi 20260211120000_officina_gestionale_core.sql → public.ruolo_utente)

do $$ begin
  create type public.stato_lavorazione as enum (
    'bozza',
    'in_coda',
    'in_officina',
    'in_attesa_ricambi',
    'completata',
    'consegnata',
    'annullata'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.priorita_lavorazione as enum ('bassa', 'media', 'alta', 'urgente');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.tipo_scheda_lavorazione as enum ('ingresso', 'intervento', 'ricambi');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.tipo_movimento_ricambio as enum ('entrata', 'uscita');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.categoria_documento as enum ('listino', 'manuale', 'catalogo', 'altro');
exception
  when duplicate_object then null;
end $$;

-- updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 1. profiles (id = auth.users.id) — tabella creata in 20260211120000 con ruolo_utente
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  ruolo public.ruolo_utente not null default 'operatore',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_nome_chk check (char_length(trim(nome)) > 0)
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 2. mezzi
create table if not exists public.mezzi (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  utilizzatore text,
  marca text not null,
  modello text not null,
  targa text,
  matricola text not null,
  numero_scuderia text,
  anno integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mezzi_cliente_chk check (char_length(trim(cliente)) > 0),
  constraint mezzi_marca_chk check (char_length(trim(marca)) > 0),
  constraint mezzi_modello_chk check (char_length(trim(modello)) > 0),
  constraint mezzi_matricola_chk check (char_length(trim(matricola)) > 0),
  constraint mezzi_anno_chk check (anno is null or (anno between 1950 and 2100))
);

drop trigger if exists trg_mezzi_updated_at on public.mezzi;
create trigger trg_mezzi_updated_at
before update on public.mezzi
for each row execute function public.set_updated_at();

create index if not exists idx_mezzi_cliente_trgm on public.mezzi using gin (cliente gin_trgm_ops);

-- 3. lavorazioni
create table if not exists public.lavorazioni (
  id uuid primary key default gen_random_uuid(),
  mezzo_id uuid not null references public.mezzi (id) on delete restrict,
  stato public.stato_lavorazione not null default 'in_coda',
  priorita public.priorita_lavorazione not null default 'media',
  data_ingresso date,
  data_uscita date,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lavorazioni_date_chk check (
    data_uscita is null or data_ingresso is null or data_uscita >= data_ingresso
  )
);

drop trigger if exists trg_lavorazioni_updated_at on public.lavorazioni;
create trigger trg_lavorazioni_updated_at
before update on public.lavorazioni
for each row execute function public.set_updated_at();

create index if not exists idx_lavorazioni_mezzo_id on public.lavorazioni (mezzo_id);

-- 4. scheda_lavorazione
create table if not exists public.scheda_lavorazione (
  id uuid primary key default gen_random_uuid(),
  lavorazione_id uuid not null references public.lavorazioni (id) on delete cascade,
  tipo public.tipo_scheda_lavorazione not null,
  contenuto jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheda_contenuto_obj_chk check (jsonb_typeof(contenuto) = 'object')
);

drop trigger if exists trg_scheda_lavorazione_updated_at on public.scheda_lavorazione;
create trigger trg_scheda_lavorazione_updated_at
before update on public.scheda_lavorazione
for each row execute function public.set_updated_at();

create index if not exists idx_scheda_lavorazione_contenuto_gin on public.scheda_lavorazione using gin (contenuto);

-- 5. magazzino_ricambi
create table if not exists public.magazzino_ricambi (
  id uuid primary key default gen_random_uuid(),
  codice text not null,
  nome text not null,
  marca text,
  quantita numeric(14, 3) not null default 0,
  costo numeric(14, 4),
  prezzo_vendita numeric(14, 4),
  consumo_medio_mensile numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint magazzino_ricambi_codice_uq unique (codice),
  constraint magazzino_ricambi_nome_chk check (char_length(trim(nome)) > 0),
  constraint magazzino_ricambi_qta_chk check (quantita >= 0)
);

drop trigger if exists trg_magazzino_ricambi_updated_at on public.magazzino_ricambi;
create trigger trg_magazzino_ricambi_updated_at
before update on public.magazzino_ricambi
for each row execute function public.set_updated_at();

create index if not exists idx_magazzino_ricambi_nome_trgm on public.magazzino_ricambi using gin (nome gin_trgm_ops);

-- 6. movimenti_ricambi
create table if not exists public.movimenti_ricambi (
  id uuid primary key default gen_random_uuid(),
  ricambio_id uuid not null references public.magazzino_ricambi (id) on delete restrict,
  lavorazione_id uuid references public.lavorazioni (id) on delete set null,
  tipo public.tipo_movimento_ricambio not null,
  quantita numeric(14, 3) not null,
  created_at timestamptz not null default now(),
  constraint movimenti_qta_chk check (quantita > 0)
);

create index if not exists idx_movimenti_ricambi_ricambio_id on public.movimenti_ricambi (ricambio_id);
create index if not exists idx_movimenti_ricambi_lavorazione_id on public.movimenti_ricambi (lavorazione_id);

-- 7. preventivi
create table if not exists public.preventivi (
  id uuid primary key default gen_random_uuid(),
  mezzo_id uuid not null references public.mezzi (id) on delete restrict,
  lavorazione_id uuid references public.lavorazioni (id) on delete set null,
  cliente text not null,
  totale numeric(14, 2) not null default 0,
  dettagli jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint preventivi_cliente_chk check (char_length(trim(cliente)) > 0),
  constraint preventivi_totale_chk check (totale >= 0),
  constraint preventivi_dettagli_obj_chk check (jsonb_typeof(dettagli) = 'object')
);

drop trigger if exists trg_preventivi_updated_at on public.preventivi;
create trigger trg_preventivi_updated_at
before update on public.preventivi
for each row execute function public.set_updated_at();

create index if not exists idx_preventivi_mezzo_id on public.preventivi (mezzo_id);

-- 8. documenti
create table if not exists public.documenti (
  id uuid primary key default gen_random_uuid(),
  mezzo_id uuid references public.mezzi (id) on delete set null,
  marca text not null,
  modello text,
  categoria public.categoria_documento not null default 'altro',
  url_file text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint documenti_marca_chk check (char_length(trim(marca)) > 0),
  constraint documenti_url_chk check (char_length(trim(url_file)) > 0),
  constraint documenti_meta_obj_chk check (jsonb_typeof(meta) = 'object')
);

-- 9. log_modifiche (append-only: no trigger updated_at)
create table if not exists public.log_modifiche (
  id uuid primary key default gen_random_uuid(),
  entita text not null,
  entita_id uuid not null,
  azione text not null,
  autore_id uuid references public.profiles (id) on delete set null,
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint log_entita_chk check (char_length(trim(entita)) > 0),
  constraint log_azione_chk check (char_length(trim(azione)) > 0)
);

create index if not exists idx_log_modifiche_entita_entita_id_created_at on public.log_modifiche (entita, entita_id, created_at desc);
