-- Soft delete diario operativo: UPDATE diretto su deleted_at fallisce RLS (SELECT richiede deleted_at IS NULL).
-- Stesso pattern di dashboard_promemoria / lavorazioni: RPC SECURITY DEFINER.

begin;

drop policy if exists cap_operational_diary_update on public.operational_diary_entries;
create policy cap_operational_diary_update on public.operational_diary_entries for update to authenticated
using (
  public.rbac_operational_diary_dashboard_write()
  and deleted_at is null
)
with check (
  public.rbac_operational_diary_dashboard_write()
);

comment on policy cap_operational_diary_update on public.operational_diary_entries is
  'Aggiornamenti su righe attive; WITH CHECK consente body update (non soft delete diretto).';

create or replace function public.soft_delete_operational_diary_entry(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null then
    raise exception 'Nota non valida';
  end if;

  if not public.rbac_operational_diary_dashboard_write() then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  update public.operational_diary_entries
  set deleted_at = now(),
      updated_at = now()
  where id = p_id
    and deleted_at is null;
end;
$$;

comment on function public.soft_delete_operational_diary_entry(uuid) is
  'Eliminazione logica nota diario operativo (deleted_at). Richiede write dashboard.';

revoke all on function public.soft_delete_operational_diary_entry(uuid) from public;
grant execute on function public.soft_delete_operational_diary_entry(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
