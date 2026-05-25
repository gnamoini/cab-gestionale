-- Dipendenze mezzo: distingue lavorazioni in corso vs archiviate; delete blocca solo le in corso.

begin;

create or replace function public.count_mezzo_dependencies(p_mezzo_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_mezzo_id is null then
    raise exception 'Mezzo non valido';
  end if;

  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational') then
    raise exception 'Permesso negato';
  end if;

  return jsonb_build_object(
    'lavorazioni_in_corso',
    (
      select count(*)::int
      from public.lavorazioni l
      where l.mezzo_id = p_mezzo_id
        and l.deleted_at is null
        and coalesce(l.archived, false) = false
    ),
    'lavorazioni_archiviate',
    (
      select count(*)::int
      from public.lavorazioni l
      where l.mezzo_id = p_mezzo_id
        and l.deleted_at is null
        and l.archived = true
    ),
    'lavorazioni_storiche',
    (select count(*)::int from public.lavorazioni l where l.mezzo_id = p_mezzo_id and l.deleted_at is not null),
    'preventivi',
    (select count(*)::int from public.preventivi p where p.mezzo_id = p_mezzo_id),
    'documenti',
    (select count(*)::int from public.documenti d where d.mezzo_id = p_mezzo_id),
    'schede_storiche',
    (
      select count(*)::int
      from public.scheda_lavorazione s
      inner join public.lavorazioni l on l.id = s.lavorazione_id
      where l.mezzo_id = p_mezzo_id and l.deleted_at is not null
    ),
    'schede_attive',
    (
      select count(*)::int
      from public.scheda_lavorazione s
      inner join public.lavorazioni l on l.id = s.lavorazione_id
      where l.mezzo_id = p_mezzo_id and l.deleted_at is null
    )
  );
end;
$$;

create or replace function public.delete_mezzo(p_mezzo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_in_corso int;
  v_preventivi int;
begin
  if p_mezzo_id is null then
    raise exception 'Mezzo non valido';
  end if;

  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational') then
    raise exception 'Permesso negato';
  end if;

  select count(*)::int into v_in_corso
  from public.lavorazioni l
  where l.mezzo_id = p_mezzo_id
    and l.deleted_at is null
    and coalesce(l.archived, false) = false;

  if v_in_corso > 0 then
    raise exception 'Impossibile eliminare il mezzo: è presente in una lavorazione in corso.';
  end if;

  select count(*)::int into v_preventivi
  from public.preventivi p
  where p.mezzo_id = p_mezzo_id;

  if v_preventivi > 0 then
    raise exception 'Impossibile eliminare il mezzo: restano preventivi collegati.';
  end if;

  delete from public.scheda_lavorazione s
  using public.lavorazioni l
  where s.lavorazione_id = l.id
    and l.mezzo_id = p_mezzo_id
    and l.deleted_at is not null;

  delete from public.lavorazioni l
  where l.mezzo_id = p_mezzo_id and l.deleted_at is not null;

  delete from public.mezzi m
  where m.id = p_mezzo_id;

  if not found then
    raise exception 'Mezzo non trovato';
  end if;
end;
$$;

comment on function public.delete_mezzo(uuid) is
  'Elimina mezzo dopo purge storico; blocca se lavorazioni in corso o preventivi collegati per mezzo_id.';

commit;
