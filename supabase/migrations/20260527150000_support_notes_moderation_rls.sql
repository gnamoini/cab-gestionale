-- support_notes: soft delete e risoluzione consentite agli admin (can_manage_security).
-- Scrittura contenuto resta per can_write_operational su righe attive.

begin;

drop policy if exists cap_support_notes_update on public.support_notes;

create policy cap_support_notes_update on public.support_notes
for update to authenticated
using (
  deleted_at is null
  and (
    public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
    or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
  )
)
with check (
  (
    deleted_at is not null
    and public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
  )
  or (
    deleted_at is null
    and (
      public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
      or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
    )
  )
);

comment on policy cap_support_notes_update on public.support_notes is
  'Aggiornamenti su note attive; soft delete (deleted_at) solo con can_manage_security.';

commit;
