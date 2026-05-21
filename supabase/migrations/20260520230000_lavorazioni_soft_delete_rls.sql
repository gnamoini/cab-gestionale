-- Soft delete lavorazioni: UPDATE consentito su righe attive; WITH CHECK ammette deleted_at valorizzato.

begin;

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
  'Aggiornamenti su righe non eliminate; consente impostare deleted_at (eliminazione logica).';

commit;
