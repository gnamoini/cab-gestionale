-- Codice lavorazione umano (YY-NNNN) — display only, UUID resta PK.

begin;

alter table public.lavorazioni
  add column if not exists codice text;

comment on column public.lavorazioni.codice is
  'Codice umano incrementale per anno (es. 26-0001). Generato server-side; non sostituisce id uuid.';

create table if not exists public.lavorazioni_codice_counters (
  anno smallint primary key,
  last_num integer not null default 0 check (last_num >= 0)
);

comment on table public.lavorazioni_codice_counters is
  'Contatore annuale per codice lavorazione umano (YY-NNNN).';

revoke all on table public.lavorazioni_codice_counters from public;
revoke all on table public.lavorazioni_codice_counters from anon;
revoke all on table public.lavorazioni_codice_counters from authenticated;

create or replace function public.assign_lavorazione_codice(p_created_at timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anno smallint;
  v_num integer;
  v_yy text;
begin
  v_anno := extract(year from timezone('Europe/Rome', coalesce(p_created_at, now())))::smallint;

  insert into public.lavorazioni_codice_counters (anno, last_num)
  values (v_anno, 1)
  on conflict (anno) do update
  set last_num = lavorazioni_codice_counters.last_num + 1
  returning last_num into v_num;

  v_yy := lpad((v_anno % 100)::text, 2, '0');
  return v_yy || '-' || lpad(v_num::text, 4, '0');
end;
$$;

comment on function public.assign_lavorazione_codice(timestamptz) is
  'Assegna codice lavorazione incrementale per anno solare (Europe/Rome), formato YY-NNNN.';

revoke all on function public.assign_lavorazione_codice(timestamptz) from public;

create or replace function public.trg_lavorazioni_assign_codice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.codice := public.assign_lavorazione_codice(coalesce(new.created_at, now()));
  return new;
end;
$$;

drop trigger if exists trg_lavorazioni_assign_codice on public.lavorazioni;
create trigger trg_lavorazioni_assign_codice
before insert on public.lavorazioni
for each row
execute function public.trg_lavorazioni_assign_codice();

-- Backfill righe esistenti (ordine cronologico per anno).
do $$
declare
  r record;
  v_anno smallint;
  v_num integer;
  v_yy text;
  v_codice text;
begin
  for r in
    select id, created_at
    from public.lavorazioni
    where codice is null
    order by created_at asc
  loop
    v_anno := extract(year from timezone('Europe/Rome', r.created_at))::smallint;

    insert into public.lavorazioni_codice_counters (anno, last_num)
    values (v_anno, 1)
    on conflict (anno) do update
    set last_num = lavorazioni_codice_counters.last_num + 1
    returning last_num into v_num;

    v_yy := lpad((v_anno % 100)::text, 2, '0');
    v_codice := v_yy || '-' || lpad(v_num::text, 4, '0');

    update public.lavorazioni set codice = v_codice where id = r.id;
  end loop;
end;
$$;

create unique index if not exists idx_lavorazioni_codice_active
  on public.lavorazioni (codice)
  where deleted_at is null and codice is not null;

create index if not exists idx_lavorazioni_codice_lookup
  on public.lavorazioni (codice)
  where codice is not null;

commit;
