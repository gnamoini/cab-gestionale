-- Fix role_page_access / user_page_overrides RLS: non chiamare rbac_user_page_access_level
-- direttamente da policy authenticated (revocato in 20260909120000).
-- Usa rbac_has_capability (SECURITY DEFINER, grant authenticated) come SSOT sicurezza.

drop policy if exists role_page_access_write_security on public.role_page_access;
create policy role_page_access_write_security on public.role_page_access
  for all to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

drop policy if exists user_page_overrides_select_own_or_security on public.user_page_overrides;
create policy user_page_overrides_select_own_or_security on public.user_page_overrides
  for select to authenticated
  using (
    user_id = public.rbac_auth_uid()
    or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
  );

drop policy if exists user_page_overrides_write_security on public.user_page_overrides;
create policy user_page_overrides_write_security on public.user_page_overrides
  for all to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

comment on policy role_page_access_write_security on public.role_page_access is
  'Scrittura matrice ruolo-pagina: solo can_manage_security (wrapper DEFINER).';
comment on policy user_page_overrides_select_own_or_security on public.user_page_overrides is
  'Lettura override propri o gestione sicurezza (wrapper DEFINER).';
comment on policy user_page_overrides_write_security on public.user_page_overrides is
  'Scrittura override pagina: solo can_manage_security (wrapper DEFINER).';

notify pgrst, 'reload schema';
