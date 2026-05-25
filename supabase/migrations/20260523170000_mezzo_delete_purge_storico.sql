-- Elimina mezzo: rimuove definitivamente lavorazioni già soft-deleted, poi il mezzo.

begin;

create or replace function public.delete_mezzo(p_mezzo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active int;
  v_preventivi int;
begin
  if p_mezzo_id is null then
    raise exception 'Mezzo non valido';
  end if;

  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational') then
    raise exception 'Permesso negato';
  end if;

  select count(*)::int into v_active
  from public.lavorazioni l
  where l.mezzo_id = p_mezzo_id and l.deleted_at is null;

  if v_active > 0 then
    raise exception 'Impossibile eliminare il mezzo: restano lavorazioni attive collegate.';
  end if;

  select count(*)::int into v_preventivi
  from public.preventivi p
  where p.mezzo_id = p_mezzo_id;

  if v_preventivi > 0 then
    raise exception 'Impossibile eliminare il mezzo: restano preventivi collegati.';
  end if;

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
  'Elimina mezzo dopo purge lavorazioni soft-deleted collegate; blocca se restano lavorazioni attive o preventivi.';

revoke all on function public.delete_mezzo(uuid) from public;
grant execute on function public.delete_mezzo(uuid) to authenticated;

commit;
