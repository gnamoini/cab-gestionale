-- Security remediation v2 (SEC-24): tighten metadata / audit table SELECT policies.

drop policy if exists health_score_runs_select_auth on public.health_score_runs;

create policy health_score_runs_select_staff on public.health_score_runs
  for select to authenticated
  using (
    public.rbac_report_page_read()
    or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
  );

-- organizations: optional table (not in core migrations); tighten if present
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'organizations'
  ) then
    execute 'alter table public.organizations enable row level security';

    execute 'drop policy if exists organizations_select_authenticated on public.organizations';
    execute 'drop policy if exists organizations_select_auth on public.organizations';
    execute 'drop policy if exists organizations_read_authenticated on public.organizations';

    execute $pol$
      create policy organizations_select_staff on public.organizations
        for select to authenticated
        using (
          not public.rbac_is_cliente()
          and public.rbac_is_operatore_or_admin()
        )
    $pol$;
  end if;
end $$;

notify pgrst, 'reload schema';
