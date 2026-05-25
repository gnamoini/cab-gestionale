-- Numerazione preventivi: collegati lavorazione (26-0001/1) e manuali (26-0001/M).
-- Assegnazione server-side in dettagli.numero; UUID resta PK.

begin;

-- ---------------------------------------------------------------------------
-- Contatori per suffisso progressivo per lavorazione
-- ---------------------------------------------------------------------------

create table if not exists public.preventivi_lavorazione_numero_counters (
  lavorazione_id uuid primary key references public.lavorazioni (id) on delete cascade,
  last_seq integer not null default 0 check (last_seq >= 0)
);

comment on table public.preventivi_lavorazione_numero_counters is
  'Contatore progressivo preventivi per lavorazione (es. 26-0001/3). Non riutilizza numeri dopo delete.';

revoke all on table public.preventivi_lavorazione_numero_counters from public;
revoke all on table public.preventivi_lavorazione_numero_counters from anon;
revoke all on table public.preventivi_lavorazione_numero_counters from authenticated;

-- ---------------------------------------------------------------------------
-- Contatori annui per preventivi manuali (senza lavorazione)
-- ---------------------------------------------------------------------------

create table if not exists public.preventivi_manuali_numero_counters (
  anno smallint primary key,
  last_num integer not null default 0 check (last_num >= 0)
);

comment on table public.preventivi_manuali_numero_counters is
  'Contatore annuale preventivi manuali, formato YY-NNNN/M.';

revoke all on table public.preventivi_manuali_numero_counters from public;
revoke all on table public.preventivi_manuali_numero_counters from anon;
revoke all on table public.preventivi_manuali_numero_counters from authenticated;

-- ---------------------------------------------------------------------------
-- assign_preventivo_numero_lavorazione
-- ---------------------------------------------------------------------------

create or replace function public.assign_preventivo_numero_lavorazione(p_lavorazione_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codice text;
  v_seq integer;
begin
  select codice into v_codice
  from public.lavorazioni
  where id = p_lavorazione_id;

  if v_codice is null or trim(v_codice) = '' then
    raise exception 'Lavorazione % senza codice umano: impossibile numerare il preventivo.', p_lavorazione_id;
  end if;

  insert into public.preventivi_lavorazione_numero_counters (lavorazione_id, last_seq)
  values (p_lavorazione_id, 1)
  on conflict (lavorazione_id) do update
  set last_seq = preventivi_lavorazione_numero_counters.last_seq + 1
  returning last_seq into v_seq;

  return trim(v_codice) || '/' || v_seq::text;
end;
$$;

comment on function public.assign_preventivo_numero_lavorazione(uuid) is
  'Assegna numero preventivo collegato a lavorazione (es. 26-0001/2). Atomico, non riutilizza suffissi.';

revoke all on function public.assign_preventivo_numero_lavorazione(uuid) from public;

-- ---------------------------------------------------------------------------
-- assign_preventivo_numero_manuale
-- ---------------------------------------------------------------------------

create or replace function public.assign_preventivo_numero_manuale(p_created_at timestamptz default now())
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

  insert into public.preventivi_manuali_numero_counters (anno, last_num)
  values (v_anno, 1)
  on conflict (anno) do update
  set last_num = preventivi_manuali_numero_counters.last_num + 1
  returning last_num into v_num;

  v_yy := lpad((v_anno % 100)::text, 2, '0');
  return v_yy || '-' || lpad(v_num::text, 4, '0') || '/M';
end;
$$;

comment on function public.assign_preventivo_numero_manuale(timestamptz) is
  'Assegna numero preventivo manuale annuale (es. 26-0001/M).';

revoke all on function public.assign_preventivo_numero_manuale(timestamptz) from public;

-- ---------------------------------------------------------------------------
-- Trigger BEFORE INSERT
-- ---------------------------------------------------------------------------

create or replace function public.trg_preventivi_assign_numero()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero text;
begin
  if new.lavorazione_id is not null then
    v_numero := public.assign_preventivo_numero_lavorazione(new.lavorazione_id);
  else
    v_numero := public.assign_preventivo_numero_manuale(coalesce(new.created_at, now()));
  end if;

  new.dettagli := jsonb_set(
    coalesce(new.dettagli, '{}'::jsonb),
    '{numero}',
    to_jsonb(v_numero),
    true
  );

  return new;
end;
$$;

drop trigger if exists trg_preventivi_assign_numero on public.preventivi;
create trigger trg_preventivi_assign_numero
before insert on public.preventivi
for each row
execute function public.trg_preventivi_assign_numero();

-- ---------------------------------------------------------------------------
-- Backfill preventivi collegati a lavorazione
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
  v_codice text;
  v_seq integer;
  v_numero text;
begin
  for r in
    select p.id, p.lavorazione_id, p.created_at
    from public.preventivi p
    where p.lavorazione_id is not null
    order by p.lavorazione_id, p.created_at asc
  loop
    select codice into v_codice
    from public.lavorazioni
    where id = r.lavorazione_id;

    if v_codice is null or trim(v_codice) = '' then
      continue;
    end if;

    insert into public.preventivi_lavorazione_numero_counters (lavorazione_id, last_seq)
    values (r.lavorazione_id, 1)
    on conflict (lavorazione_id) do update
    set last_seq = preventivi_lavorazione_numero_counters.last_seq + 1
    returning last_seq into v_seq;

    v_numero := trim(v_codice) || '/' || v_seq::text;

    update public.preventivi
    set dettagli = jsonb_set(
      coalesce(dettagli, '{}'::jsonb),
      '{numero}',
      to_jsonb(v_numero),
      true
    )
    where id = r.id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill preventivi manuali (senza lavorazione)
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
  v_anno smallint;
  v_num integer;
  v_yy text;
  v_numero text;
begin
  for r in
    select id, created_at
    from public.preventivi
    where lavorazione_id is null
    order by created_at asc
  loop
    v_anno := extract(year from timezone('Europe/Rome', r.created_at))::smallint;

    insert into public.preventivi_manuali_numero_counters (anno, last_num)
    values (v_anno, 1)
    on conflict (anno) do update
    set last_num = preventivi_manuali_numero_counters.last_num + 1
    returning last_num into v_num;

    v_yy := lpad((v_anno % 100)::text, 2, '0');
    v_numero := v_yy || '-' || lpad(v_num::text, 4, '0') || '/M';

    update public.preventivi
    set dettagli = jsonb_set(
      coalesce(dettagli, '{}'::jsonb),
      '{numero}',
      to_jsonb(v_numero),
      true
    )
    where id = r.id;
  end loop;
end;
$$;

commit;
