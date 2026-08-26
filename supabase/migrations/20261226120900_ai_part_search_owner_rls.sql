-- SEC-16: identifica-ricambio horizontal IDOR — bind rows to created_by (owner) + module gate.

drop policy if exists cap_ai_part_searches_select on public.ai_part_searches;
create policy cap_ai_part_searches_select on public.ai_part_searches
  for select to authenticated
  using (
    public.rbac_module_can('magazzino', 'read')
    and (
      created_by = public.rbac_auth_uid()
      or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
    )
  );

drop policy if exists cap_ai_part_searches_update on public.ai_part_searches;
create policy cap_ai_part_searches_update on public.ai_part_searches
  for update to authenticated
  using (
    public.rbac_module_can('magazzino', 'write')
    and (
      created_by = public.rbac_auth_uid()
      or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
    )
  )
  with check (
    public.rbac_module_can('magazzino', 'write')
    and (
      created_by = public.rbac_auth_uid()
      or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
    )
  );

drop policy if exists cap_ai_part_search_assets_select on public.ai_part_search_assets;
create policy cap_ai_part_search_assets_select on public.ai_part_search_assets
  for select to authenticated
  using (
    public.rbac_module_can('magazzino', 'read')
    and exists (
      select 1 from public.ai_part_searches s
      where s.id = search_id
        and (
          s.created_by = public.rbac_auth_uid()
          or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
        )
    )
  );

drop policy if exists cap_ai_part_search_assets_insert on public.ai_part_search_assets;
create policy cap_ai_part_search_assets_insert on public.ai_part_search_assets
  for insert to authenticated
  with check (
    public.rbac_module_can('magazzino', 'write')
    and exists (
      select 1 from public.ai_part_searches s
      where s.id = search_id
        and (
          s.created_by = public.rbac_auth_uid()
          or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
        )
    )
  );

drop policy if exists cap_ai_part_candidates_select on public.ai_part_candidates;
create policy cap_ai_part_candidates_select on public.ai_part_candidates
  for select to authenticated
  using (
    public.rbac_module_can('magazzino', 'read')
    and exists (
      select 1 from public.ai_part_searches s
      where s.id = search_id
        and (
          s.created_by = public.rbac_auth_uid()
          or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
        )
    )
  );

drop policy if exists cap_ai_part_evidence_select on public.ai_part_evidence;
create policy cap_ai_part_evidence_select on public.ai_part_evidence
  for select to authenticated
  using (
    public.rbac_module_can('magazzino', 'read')
    and exists (
      select 1 from public.ai_part_searches s
      where s.id = search_id
        and (
          s.created_by = public.rbac_auth_uid()
          or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
        )
    )
  );
