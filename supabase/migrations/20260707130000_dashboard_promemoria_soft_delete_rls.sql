-- Soft delete promemoria dashboard: policy UPDATE allineata a lavorazioni + RPC (evita WITH CHECK RLS su deleted_at).

begin;

drop policy if exists cap_dashboard_promemoria_update on public.dashboard_promemoria;
create policy cap_dashboard_promemoria_update on public.dashboard_promemoria for update to authenticated
using (
  public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
  and deleted_at is null
)
with check (
  public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
);

comment on policy cap_dashboard_promemoria_update on public.dashboard_promemoria is
  'UPDATE su righe attive; WITH CHECK consente deleted_at (soft delete) e aggiornamenti normali.';

create or replace function public.soft_delete_dashboard_promemoria(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null then
    raise exception 'Promemoria non valido';
  end if;

  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  update public.dashboard_promemoria
  set deleted_at = now(),
      updated_at = now()
  where id = p_id
    and deleted_at is null;

  if not found then
    raise exception 'Promemoria non trovato o già eliminato';
  end if;
end;
$$;

comment on function public.soft_delete_dashboard_promemoria(uuid) is
  'Eliminazione logica promemoria dashboard (deleted_at). Richiede can_write_operational.';

revoke all on function public.soft_delete_dashboard_promemoria(uuid) from public;
grant execute on function public.soft_delete_dashboard_promemoria(uuid) to authenticated;

commit;
