-- ponytail: rimuovere trigger dopo R4 column drop (manual migration)

create or replace function public.mezzo_attrezzature_v2_db_enabled()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select (s.value->>'enabled')::boolean
      from public.app_settings s
      where s.module = 'system'
        and s.key = 'mezzo_attrezzature_v2'
    ),
    false
  );
$$;

create or replace function public.mezzi_legacy_attrezzatura_valued(p_marca text, p_modello text, p_matricola text, p_tipo text)
returns boolean
language sql
immutable
as $$
  select
    coalesce(nullif(trim(p_marca), ''), '') not in ('', '—', 'non assegnata')
    or coalesce(nullif(trim(p_modello), ''), '') not in ('', '—', 'non assegnata')
    or coalesce(nullif(trim(p_matricola), ''), '') not in ('', '—', 'non assegnata')
    or coalesce(nullif(trim(p_tipo), ''), '') not in ('', '—', 'non assegnata');
$$;

create or replace function public.guard_mezzi_legacy_attrezzatura_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.mezzo_attrezzature_v2_db_enabled() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if public.mezzi_legacy_attrezzatura_valued(new.marca, new.modello, new.matricola, new.tipo_attrezzatura) then
      raise exception 'mezzi legacy attrezzatura columns are read-only when mezzo_attrezzature_v2 is enabled';
    end if;
    return new;
  end if;

  if new.marca is distinct from old.marca
     and public.mezzi_legacy_attrezzatura_valued(new.marca, null, null, null) then
    raise exception 'mezzi.marca is read-only when mezzo_attrezzature_v2 is enabled';
  end if;
  if new.modello is distinct from old.modello
     and public.mezzi_legacy_attrezzatura_valued(null, new.modello, null, null) then
    raise exception 'mezzi.modello is read-only when mezzo_attrezzature_v2 is enabled';
  end if;
  if new.matricola is distinct from old.matricola
     and public.mezzi_legacy_attrezzatura_valued(null, null, new.matricola, null) then
    raise exception 'mezzi.matricola is read-only when mezzo_attrezzature_v2 is enabled';
  end if;
  if new.tipo_attrezzatura is distinct from old.tipo_attrezzatura
     and public.mezzi_legacy_attrezzatura_valued(null, null, null, new.tipo_attrezzatura) then
    raise exception 'mezzi.tipo_attrezzatura is read-only when mezzo_attrezzature_v2 is enabled';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_mezzi_legacy_attrezzatura_write on public.mezzi;
create trigger guard_mezzi_legacy_attrezzatura_write
before insert or update on public.mezzi
for each row execute function public.guard_mezzi_legacy_attrezzatura_write();
