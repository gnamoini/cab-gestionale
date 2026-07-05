-- RLS: tabelle public senza row security + policy mancanti (TKB / counter / registry).

begin;

-- ponytail: counter + registry = RLS on + revoke client roles; accesso solo via SECURITY DEFINER.

revoke all on table public.ddt_numero_counters from public, anon, authenticated;
alter table public.ddt_numero_counters enable row level security;

alter table public.lavorazioni_codice_counters enable row level security;
alter table public.ordini_fornitori_numero_counters enable row level security;
alter table public.preventivi_lavorazione_numero_counters enable row level security;
alter table public.preventivi_manuali_numero_counters enable row level security;

alter table public.notification_type_registry enable row level security;

-- TKB catalog + registry (oggi: pipeline admin manageSecurity)
alter table public.tkb_version_registry enable row level security;
alter table public.interventi_categorie enable row level security;
alter table public.interventi_componenti enable row level security;
alter table public.interventi_sintomi enable row level security;
alter table public.interventi_procedure enable row level security;
alter table public.interventi_catalogo enable row level security;
alter table public.interventi_catalogo_audit enable row level security;
alter table public.ricambi_componenti_map enable row level security;

create policy tkb_version_registry_select on public.tkb_version_registry
  for select to authenticated using (true);

create policy tkb_version_registry_insert on public.tkb_version_registry
  for insert to authenticated
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

create policy tkb_version_registry_update on public.tkb_version_registry
  for update to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

create policy tkb_interventi_categorie_admin on public.interventi_categorie
  for all to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

create policy tkb_interventi_componenti_admin on public.interventi_componenti
  for all to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

create policy tkb_interventi_sintomi_admin on public.interventi_sintomi
  for all to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

create policy tkb_interventi_procedure_admin on public.interventi_procedure
  for all to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

create policy tkb_interventi_catalogo_admin on public.interventi_catalogo
  for all to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

create policy tkb_interventi_catalogo_audit_admin on public.interventi_catalogo_audit
  for all to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

create policy tkb_ricambi_componenti_map_admin on public.ricambi_componenti_map
  for all to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
  with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

-- Description Engine telemetry (RLS già on, policy assenti)
create policy tkb_desc_gen_usage_select on public.description_generation_usage
  for select to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

create policy tkb_desc_gen_lines_select on public.description_generation_lines
  for select to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

create policy tkb_desc_operator_overrides_select on public.description_operator_overrides
  for select to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

create policy tkb_preventivi_desc_suggestions_select on public.preventivi_description_suggestions
  for select to authenticated
  using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

-- Verifica
do $$
declare
  v_table text;
  v_missing_rls text[] := array[]::text[];
  v_missing_policy text[] := array[]::text[];
  v_tables text[] := array[
    'ddt_numero_counters', 'lavorazioni_codice_counters', 'ordini_fornitori_numero_counters',
    'preventivi_lavorazione_numero_counters', 'preventivi_manuali_numero_counters',
    'notification_type_registry', 'tkb_version_registry',
    'interventi_categorie', 'interventi_componenti', 'interventi_sintomi',
    'interventi_procedure', 'interventi_catalogo', 'interventi_catalogo_audit',
    'ricambi_componenti_map', 'description_generation_usage', 'description_generation_lines',
    'description_operator_overrides', 'preventivi_description_suggestions'
  ];
  v_policy_tables text[] := array[
    'tkb_version_registry', 'interventi_categorie', 'interventi_componenti', 'interventi_sintomi',
    'interventi_procedure', 'interventi_catalogo', 'interventi_catalogo_audit',
    'ricambi_componenti_map', 'description_generation_usage', 'description_generation_lines',
    'description_operator_overrides', 'preventivi_description_suggestions'
  ];
begin
  foreach v_table in array v_tables loop
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v_table and c.relrowsecurity
    ) then
      v_missing_rls := array_append(v_missing_rls, v_table);
    end if;
  end loop;

  foreach v_table in array v_policy_tables loop
    if not exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = v_table
    ) then
      v_missing_policy := array_append(v_missing_policy, v_table);
    end if;
  end loop;

  if coalesce(array_length(v_missing_rls, 1), 0) > 0 then
    raise exception 'RLS non attivo su: %', array_to_string(v_missing_rls, ', ');
  end if;
  if coalesce(array_length(v_missing_policy, 1), 0) > 0 then
    raise exception 'Policy RLS mancanti su: %', array_to_string(v_missing_policy, ', ');
  end if;

  raise notice 'RLS missing tables hardening OK (% tabelle).', coalesce(array_length(v_tables, 1), 0);
end $$;

commit;
