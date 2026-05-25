-- Conteggio dipendenze mezzo per delete: include lavorazioni soft-deleted (invisibili via RLS SELECT).

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
    'lavorazioni_attive',
    (select count(*)::int from public.lavorazioni l where l.mezzo_id = p_mezzo_id and l.deleted_at is null),
    'lavorazioni_storiche',
    (select count(*)::int from public.lavorazioni l where l.mezzo_id = p_mezzo_id and l.deleted_at is not null),
    'preventivi',
    (select count(*)::int from public.preventivi p where p.mezzo_id = p_mezzo_id),
    'documenti',
    (select count(*)::int from public.documenti d where d.mezzo_id = p_mezzo_id),
    'schede',
    (
      select count(*)::int
      from public.scheda_lavorazione s
      inner join public.lavorazioni l on l.id = s.lavorazione_id
      where l.mezzo_id = p_mezzo_id
    )
  );
end;
$$;

comment on function public.count_mezzo_dependencies(uuid) is
  'Dipendenze reali per eliminazione mezzo (incluso storico lavorazioni soft-deleted).';

revoke all on function public.count_mezzo_dependencies(uuid) from public;
grant execute on function public.count_mezzo_dependencies(uuid) to authenticated;

commit;
