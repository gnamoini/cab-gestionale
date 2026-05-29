-- Login: resolve_auth_email_for_login solo service_role (no enumerazione anon).
-- support_notes: update allineato a permessi modulo (non più can_write_operational globale).

-- ---------------------------------------------------------------------------
-- 1. Login email resolution — revoca anon/authenticated
-- ---------------------------------------------------------------------------
revoke execute on function public.resolve_auth_email_for_login(text) from anon;
revoke execute on function public.resolve_auth_email_for_login(text) from authenticated;
grant execute on function public.resolve_auth_email_for_login(text) to service_role;

comment on function public.resolve_auth_email_for_login(text) is
  'Risoluzione username→email per login. Solo service_role: chiamare da Server Action, non dal client anon.';

-- ---------------------------------------------------------------------------
-- 2. support_notes — write su almeno un modulo operativo
-- ---------------------------------------------------------------------------
create or replace function public.rbac_staff_has_any_module_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_effective_can('magazzino', 'write')
    or public.user_effective_can('preventivi', 'write')
    or public.user_effective_can('lavorazioni', 'write')
    or public.user_effective_can('mezzi', 'write')
    or public.user_effective_can('report', 'write')
    or public.user_effective_can('documenti', 'write');
$$;

revoke all on function public.rbac_staff_has_any_module_write() from public;
grant execute on function public.rbac_staff_has_any_module_write() to authenticated;

drop policy if exists cap_support_notes_update on public.support_notes;

create policy cap_support_notes_update on public.support_notes
for update to authenticated
using (
  deleted_at is null
  and (
    public.rbac_staff_has_any_module_write()
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
      public.rbac_staff_has_any_module_write()
      or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
    )
  )
);

comment on policy cap_support_notes_update on public.support_notes is
  'Aggiornamenti su note attive con write su almeno un modulo; soft delete solo security admin.';
