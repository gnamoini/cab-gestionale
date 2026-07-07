-- Complemento 20260907120000: RLS tabelle pagina + capability bridge da matrice pagina.
-- Idempotente su ambienti dove 20260907120000 è già applicata senza RLS.

-- ponytail: elenco pagine "operative" fisso; estendere con catalogo se nascono nuove pagine ERP
create or replace function public.rbac_has_capability(p_user_id uuid, p_capability text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role_key text;
begin
  if p_user_id is null or p_capability is null or p_capability = '' then
    return false;
  end if;

  v_role_key := public.rbac_role_for_user(p_user_id);
  if v_role_key = 'admin' then
    return true;
  end if;

  case p_capability
    when 'can_manage_security' then
      return public.rbac_user_page_access_level(p_user_id, 'sicurezza') = 'write';
    when 'can_manage_settings' then
      return public.rbac_user_page_access_level(p_user_id, 'impostazioni') = 'write';
    when 'can_access_client_area' then
      return public.rbac_user_page_access_level(p_user_id, 'lavorazioni_clienti') in ('read', 'write');
    when 'can_read_operational' then
      return exists (
        select 1
        from unnest(ARRAY[
          'dashboard', 'agenda', 'lavorazioni', 'preventivi', 'fatturazione',
          'documenti', 'magazzino', 'mezzi', 'dipendenti', 'report'
        ]::text[]) as t(page_key)
        where public.rbac_user_page_access_level(p_user_id, t.page_key) in ('read', 'write')
      );
    when 'can_write_operational' then
      return exists (
        select 1
        from unnest(ARRAY[
          'dashboard', 'agenda', 'lavorazioni', 'preventivi', 'fatturazione',
          'documenti', 'magazzino', 'mezzi', 'dipendenti', 'report'
        ]::text[]) as t(page_key)
        where public.rbac_user_page_access_level(p_user_id, t.page_key) = 'write'
      );
    else
      return public.rbac_user_effective_permission(p_user_id, p_capability);
  end case;
end;
$$;

alter table public.role_page_access enable row level security;
alter table public.user_page_overrides enable row level security;
alter table public.rbac_page_module_expansion enable row level security;

drop policy if exists role_page_access_select_auth on public.role_page_access;
create policy role_page_access_select_auth on public.role_page_access
  for select to authenticated using (true);

drop policy if exists role_page_access_write_security on public.role_page_access;
create policy role_page_access_write_security on public.role_page_access
  for all to authenticated
  using (public.rbac_user_page_access_level(auth.uid(), 'sicurezza') = 'write')
  with check (public.rbac_user_page_access_level(auth.uid(), 'sicurezza') = 'write');

drop policy if exists user_page_overrides_select_own_or_security on public.user_page_overrides;
create policy user_page_overrides_select_own_or_security on public.user_page_overrides
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.rbac_user_page_access_level(auth.uid(), 'sicurezza') = 'write'
  );

drop policy if exists user_page_overrides_write_security on public.user_page_overrides;
create policy user_page_overrides_write_security on public.user_page_overrides
  for all to authenticated
  using (public.rbac_user_page_access_level(auth.uid(), 'sicurezza') = 'write')
  with check (public.rbac_user_page_access_level(auth.uid(), 'sicurezza') = 'write');

drop policy if exists rbac_page_module_expansion_select_auth on public.rbac_page_module_expansion;
create policy rbac_page_module_expansion_select_auth on public.rbac_page_module_expansion
  for select to authenticated using (true);

revoke all on public.role_page_access, public.user_page_overrides, public.rbac_page_module_expansion from anon;
grant select on public.role_page_access, public.rbac_page_module_expansion to authenticated;
grant select, insert, update, delete on public.role_page_access, public.user_page_overrides to authenticated;

revoke all on function public.rbac_user_page_access_level(uuid, text) from public, anon, authenticated;
revoke all on function public.rbac_module_from_page_access(uuid, text, text) from public, anon, authenticated;
grant execute on function public.rbac_user_page_access_level(uuid, text) to service_role;
grant execute on function public.rbac_module_from_page_access(uuid, text, text) to service_role;

notify pgrst, 'reload schema';
