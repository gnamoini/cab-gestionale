-- Backfill idempotente: mezzi legacy → attrezzature + colonne telaio + lavorazioni target

-- 1. Promote meta telaio → colonne mezzi
update public.mezzi m
set
  marca_telaio = coalesce(nullif(trim(m.meta->>'marcaTelaio'), ''), m.marca_telaio),
  modello_telaio = coalesce(nullif(trim(m.meta->>'modelloTelaio'), ''), m.modello_telaio),
  tipo_telaio = coalesce(nullif(trim(m.meta->>'tipoTelaio'), ''), m.tipo_telaio),
  km = coalesce(
    case
      when (m.meta->>'km') ~ '^-?[0-9]+(\.[0-9]+)?$' then (m.meta->>'km')::numeric
      else null
    end,
    m.km
  )
where m.meta is not null and m.meta <> '{}'::jsonb;

-- 2. Attrezzature 1:1 da mezzi (skip se già presente per mezzo_id singola)
insert into public.attrezzature (mezzo_id, marca, modello, tipo_attrezzatura, matricola, anno, created_by)
select
  m.id,
  m.marca,
  coalesce(nullif(trim(m.modello), ''), '—'),
  nullif(trim(m.tipo_attrezzatura), ''),
  nullif(trim(m.matricola), ''),
  m.anno,
  m.created_by
from public.mezzi m
where not exists (
  select 1 from public.attrezzature a where a.mezzo_id = m.id
);

-- 3. Lavorazioni → target attrezzatura (prima attrezzatura del mezzo)
update public.lavorazioni l
set
  target_type = 'attrezzatura',
  attrezzatura_id = a.id
from public.attrezzature a
where a.mezzo_id = l.mezzo_id
  and l.target_type is null
  and l.attrezzatura_id is null
  and not exists (
    select 1 from public.attrezzature a2
    where a2.mezzo_id = l.mezzo_id and a2.id <> a.id
  );

-- Mezzi con più attrezzature (post-split manuale): collega alla prima per id
update public.lavorazioni l
set
  target_type = 'attrezzatura',
  attrezzatura_id = sub.att_id
from (
  select l2.id as lav_id, (
    select a.id from public.attrezzature a
    where a.mezzo_id = l2.mezzo_id
    order by a.created_at asc, a.id asc
    limit 1
  ) as att_id
  from public.lavorazioni l2
  where l2.target_type is null
) sub
where l.id = sub.lav_id
  and sub.att_id is not null
  and l.target_type is null;

-- Default residuo: telaio (mezzi senza attrezzatura)
update public.lavorazioni
set target_type = 'telaio'
where target_type is null;

-- 4. Vincoli NOT NULL + coerenza target
alter table public.lavorazioni alter column target_type set default 'attrezzatura';
alter table public.lavorazioni alter column target_type set not null;

alter table public.lavorazioni drop constraint if exists lavorazioni_target_coerente;
alter table public.lavorazioni add constraint lavorazioni_target_coerente check (
  (target_type = 'telaio' and attrezzatura_id is null)
  or (target_type = 'attrezzatura' and attrezzatura_id is not null)
);

-- ponytail: trigger sync legacy mezzi columns — drop at R2 completion
create or replace function public.sync_mezzi_legacy_from_attrezzatura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_marca text;
  v_modello text;
  v_matricola text;
  v_tipo text;
begin
  select count(*)::int into v_count
  from public.attrezzature a
  where a.mezzo_id = coalesce(new.mezzo_id, old.mezzo_id);

  if v_count = 1 then
    select a.marca, a.modello, a.matricola, a.tipo_attrezzatura
    into v_marca, v_modello, v_matricola, v_tipo
    from public.attrezzature a
    where a.mezzo_id = coalesce(new.mezzo_id, old.mezzo_id)
    limit 1;

    update public.mezzi m
    set
      marca = coalesce(v_marca, m.marca),
      modello = coalesce(v_modello, m.modello),
      matricola = v_matricola,
      tipo_attrezzatura = v_tipo
    where m.id = coalesce(new.mezzo_id, old.mezzo_id);
  elsif v_count = 0 then
    update public.mezzi m
    set
      marca = coalesce(nullif(trim(m.marca_telaio), ''), m.marca),
      modello = coalesce(nullif(trim(m.modello_telaio), ''), m.modello, '—'),
      matricola = null,
      tipo_attrezzatura = null
    where m.id = coalesce(new.mezzo_id, old.mezzo_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_mezzi_legacy_from_attrezzatura on public.attrezzature;
create trigger trg_sync_mezzi_legacy_from_attrezzatura
after insert or update or delete on public.attrezzature
for each row execute function public.sync_mezzi_legacy_from_attrezzatura();

-- Sync iniziale legacy columns da attrezzature esistenti
update public.mezzi m
set
  marca = a.marca,
  modello = a.modello,
  matricola = a.matricola,
  tipo_attrezzatura = a.tipo_attrezzatura
from public.attrezzature a
where a.mezzo_id = m.id
  and (select count(*) from public.attrezzature a2 where a2.mezzo_id = m.id) = 1;
