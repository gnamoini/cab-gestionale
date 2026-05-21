-- Eliminazione logica lavorazioni: RPC sicura (evita fallimento WITH CHECK RLS su UPDATE deleted_at).

begin;

-- Rimuove policy legacy duplicate che possono bloccare il soft delete.
drop policy if exists lavorazioni_update_priv on public.lavorazioni;
drop policy if exists rbac_lavorazioni_update on public.lavorazioni;

drop policy if exists cap_lavorazioni_update on public.lavorazioni;
create policy cap_lavorazioni_update on public.lavorazioni for update to authenticated
using (
  public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
  and deleted_at is null
)
with check (
  public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
);

comment on policy cap_lavorazioni_update on public.lavorazioni is
  'UPDATE su righe attive; WITH CHECK consente deleted_at (soft delete) e aggiornamenti normali.';

-- Soft delete centralizzato: admin/operatore con can_delete su lavorazioni.
create or replace function public.soft_delete_lavorazione(p_lavorazione_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_lavorazione_id is null then
    raise exception 'Lavorazione non valida';
  end if;

  if not public.rbac_can_delete('lavorazioni') then
    raise exception 'Permesso negato';
  end if;

  update public.lavorazioni
  set deleted_at = now(),
      updated_at = now()
  where id = p_lavorazione_id
    and deleted_at is null;

  if not found then
    raise exception 'Lavorazione non trovata o già eliminata';
  end if;
end;
$$;

comment on function public.soft_delete_lavorazione(uuid) is
  'Eliminazione logica lavorazione (deleted_at). Richiede rbac_can_delete(lavorazioni).';

revoke all on function public.soft_delete_lavorazione(uuid) from public;
grant execute on function public.soft_delete_lavorazione(uuid) to authenticated;

commit;
