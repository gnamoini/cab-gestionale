-- FASE 5 — Admin master data RPC + RLS.
begin;

-- RBAC helper
create or replace function public.admin_master_data_rbac_can(p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_role text;
begin
  if v_uid is null then return false; end if;
  v_role := lower(trim(public.rbac_role_for_user(v_uid)));
  if v_role = 'admin' then return true; end if;
  if p_action = 'read' then
    return public.rbac_has_capability(v_uid, 'can_manage_settings')
      or public.rbac_module_can('fatturazione', 'read')
      or public.rbac_module_can('contabilita', 'read');
  end if;
  if p_action in ('write', 'admin') then
    return public.rbac_has_capability(v_uid, 'can_manage_settings');
  end if;
  return false;
end;
$$;

-- RLS on new tables
alter table public.fiscal_regimes enable row level security;
alter table public.document_series enable row level security;
alter table public.admin_master_data_conflicts enable row level security;

drop policy if exists cap_fiscal_regimes_select on public.fiscal_regimes;
create policy cap_fiscal_regimes_select on public.fiscal_regimes
for select to authenticated using (company_id = public.rbac_user_company_id());

drop policy if exists cap_document_series_select on public.document_series;
create policy cap_document_series_select on public.document_series
for select to authenticated using (company_id = public.rbac_user_company_id());

drop policy if exists cap_admin_conflicts_select on public.admin_master_data_conflicts;
create policy cap_admin_conflicts_select on public.admin_master_data_conflicts
for select to authenticated
using (company_id = public.rbac_user_company_id() and public.admin_master_data_rbac_can('read'));

drop policy if exists cap_cliente_bank_accounts_select on public.cliente_bank_accounts;
create policy cap_cliente_bank_accounts_select on public.cliente_bank_accounts
for select to authenticated
using (
  exists (
    select 1 from public.clienti_anagrafiche ca
    where ca.id = cliente_id and ca.company_id = public.rbac_user_company_id()
  ) and public.admin_master_data_rbac_can('read')
);

drop policy if exists cap_fornitori_anagrafiche_select on public.fornitori_anagrafiche;
create policy cap_fornitori_anagrafiche_select on public.fornitori_anagrafiche
for select to authenticated
using (company_id = public.rbac_user_company_id() and public.admin_master_data_rbac_can('read'));

drop policy if exists cap_fornitore_bank_accounts_select on public.fornitore_bank_accounts;
create policy cap_fornitore_bank_accounts_select on public.fornitore_bank_accounts
for select to authenticated
using (
  exists (
    select 1 from public.fornitori_anagrafiche fa
    where fa.id = fornitore_id and fa.company_id = public.rbac_user_company_id()
  ) and public.admin_master_data_rbac_can('read')
);

-- Revoke direct writes on master tables (RPC-only)
revoke insert, update, delete on public.clienti_anagrafiche from authenticated;
revoke insert, update, delete on public.fornitori_anagrafiche from authenticated;
revoke insert, update, delete on public.cliente_bank_accounts from authenticated;
revoke insert, update, delete on public.fornitore_bank_accounts from authenticated;

-- Expand clienti_anagrafiche operational read (existing policies may exist)
drop policy if exists cap_clienti_anagrafiche_operational_read on public.clienti_anagrafiche;
create policy cap_clienti_anagrafiche_operational_read on public.clienti_anagrafiche
for select to authenticated
using (
  public.admin_master_data_rbac_can('read')
  or public.rbac_module_can('fatturazione', 'read')
  or public.rbac_module_can('ddt', 'read')
  or public.rbac_module_can('preventivi', 'read')
);

create or replace function public.admin_create_cliente(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_id uuid;
begin
  if not public.admin_master_data_rbac_can('write') then
    raise exception 'Forbidden';
  end if;
  v_company_id := public.rbac_user_company_id();
  if v_company_id is null then raise exception 'No company'; end if;

  perform set_config('admin.master_data_ssot', 'true', true);

  insert into public.clienti_anagrafiche (
    company_id, nome_display, entity_key, ragione_sociale, nome_commerciale,
    tipo_soggetto, partita_iva, codice_fiscale, nazione, pec, codice_destinatario,
    fiscal_regime_id, default_vat_code_id, split_payment, natura_iva_default,
    default_payment_term_id, default_payment_method_id,
    default_account_id, default_accounting_journal_id, default_document_series_id,
    note, in_lista_settings
  ) values (
    v_company_id,
    coalesce(p_payload->>'nome_display', ''),
    coalesce(p_payload->>'entity_key', 'cliente:' || gen_random_uuid()::text),
    p_payload->>'ragione_sociale',
    p_payload->>'nome_commerciale',
    p_payload->>'tipo_soggetto',
    p_payload->>'partita_iva',
    p_payload->>'codice_fiscale',
    coalesce(p_payload->>'nazione', 'IT'),
    p_payload->>'pec',
    p_payload->>'codice_destinatario',
    (p_payload->>'fiscal_regime_id')::uuid,
    (p_payload->>'default_vat_code_id')::uuid,
    coalesce((p_payload->>'split_payment')::boolean, false),
    p_payload->>'natura_iva_default',
    (p_payload->>'default_payment_term_id')::uuid,
    (p_payload->>'default_payment_method_id')::uuid,
    (p_payload->>'default_account_id')::uuid,
    (p_payload->>'default_accounting_journal_id')::uuid,
    (p_payload->>'default_document_series_id')::uuid,
    p_payload->>'note',
    coalesce((p_payload->>'in_lista_settings')::boolean, true)
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Identificativo fiscale già associato a un''altra anagrafica.';
end;
$$;

create or replace function public.admin_update_cliente(p_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_master_data_rbac_can('write') then raise exception 'Forbidden'; end if;
  perform set_config('admin.master_data_ssot', 'true', true);

  update public.clienti_anagrafiche set
    nome_display = coalesce(p_payload->>'nome_display', nome_display),
    ragione_sociale = coalesce(p_payload->>'ragione_sociale', ragione_sociale),
    nome_commerciale = coalesce(p_payload->>'nome_commerciale', nome_commerciale),
    tipo_soggetto = coalesce(p_payload->>'tipo_soggetto', tipo_soggetto),
    partita_iva = case when p_payload ? 'partita_iva' then p_payload->>'partita_iva' else partita_iva end,
    codice_fiscale = case when p_payload ? 'codice_fiscale' then p_payload->>'codice_fiscale' else codice_fiscale end,
    nazione = case when p_payload ? 'nazione' then p_payload->>'nazione' else nazione end,
    pec = case when p_payload ? 'pec' then p_payload->>'pec' else pec end,
    codice_destinatario = case when p_payload ? 'codice_destinatario' then p_payload->>'codice_destinatario' else codice_destinatario end,
    fiscal_regime_id = case when p_payload ? 'fiscal_regime_id' then (p_payload->>'fiscal_regime_id')::uuid else fiscal_regime_id end,
    default_vat_code_id = case when p_payload ? 'default_vat_code_id' then (p_payload->>'default_vat_code_id')::uuid else default_vat_code_id end,
    split_payment = coalesce((p_payload->>'split_payment')::boolean, split_payment),
    natura_iva_default = coalesce(p_payload->>'natura_iva_default', natura_iva_default),
    default_payment_term_id = case when p_payload ? 'default_payment_term_id' then (p_payload->>'default_payment_term_id')::uuid else default_payment_term_id end,
    default_payment_method_id = case when p_payload ? 'default_payment_method_id' then (p_payload->>'default_payment_method_id')::uuid else default_payment_method_id end,
    default_account_id = case when p_payload ? 'default_account_id' then (p_payload->>'default_account_id')::uuid else default_account_id end,
    default_accounting_journal_id = case when p_payload ? 'default_accounting_journal_id' then (p_payload->>'default_accounting_journal_id')::uuid else default_accounting_journal_id end,
    default_document_series_id = case when p_payload ? 'default_document_series_id' then (p_payload->>'default_document_series_id')::uuid else default_document_series_id end,
    note = coalesce(p_payload->>'note', note),
    sede_legale_uguale_operativa = coalesce((p_payload->>'sede_legale_uguale_operativa')::boolean, sede_legale_uguale_operativa),
    in_lista_settings = coalesce((p_payload->>'in_lista_settings')::boolean, in_lista_settings),
    updated_by = auth.uid()
  where id = p_id and company_id = public.rbac_user_company_id();

  if not found then raise exception 'Cliente not found'; end if;
exception
  when unique_violation then
    raise exception 'Identificativo fiscale già associato a un''altra anagrafica.';
end;
$$;

create or replace function public.admin_archive_cliente(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_master_data_rbac_can('write') then raise exception 'Forbidden'; end if;
  perform set_config('admin.master_data_ssot', 'true', true);
  update public.clienti_anagrafiche
  set is_active = false, archived_at = now(), updated_by = auth.uid()
  where id = p_id and company_id = public.rbac_user_company_id();
  if not found then raise exception 'Cliente not found'; end if;
end;
$$;

create or replace function public.admin_create_fornitore(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_id uuid;
begin
  if not public.admin_master_data_rbac_can('write') then raise exception 'Forbidden'; end if;
  v_company_id := public.rbac_user_company_id();
  perform set_config('admin.master_data_ssot', 'true', true);

  insert into public.fornitori_anagrafiche (
    company_id, nome_display, ragione_sociale, partita_iva, codice_fiscale, nazione,
    indirizzo, pec, codice_destinatario, telefono, email,
    fiscal_regime_id, default_vat_code_id,
    default_payment_term_id, default_payment_method_id,
    default_account_id, default_accounting_journal_id, default_document_series_id, note
  ) values (
    v_company_id,
    coalesce(p_payload->>'nome_display', ''),
    p_payload->>'ragione_sociale',
    p_payload->>'partita_iva',
    p_payload->>'codice_fiscale',
    coalesce(p_payload->>'nazione', 'IT'),
    p_payload->>'indirizzo',
    p_payload->>'pec',
    p_payload->>'codice_destinatario',
    p_payload->>'telefono',
    p_payload->>'email',
    (p_payload->>'fiscal_regime_id')::uuid,
    (p_payload->>'default_vat_code_id')::uuid,
    (p_payload->>'default_payment_term_id')::uuid,
    (p_payload->>'default_payment_method_id')::uuid,
    (p_payload->>'default_account_id')::uuid,
    (p_payload->>'default_accounting_journal_id')::uuid,
    (p_payload->>'default_document_series_id')::uuid,
    p_payload->>'note'
  )
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'Identificativo fiscale già associato a un''altra anagrafica.';
end;
$$;

create or replace function public.admin_update_fornitore(p_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_master_data_rbac_can('write') then raise exception 'Forbidden'; end if;
  perform set_config('admin.master_data_ssot', 'true', true);
  update public.fornitori_anagrafiche set
    nome_display = coalesce(p_payload->>'nome_display', nome_display),
    ragione_sociale = coalesce(p_payload->>'ragione_sociale', ragione_sociale),
    partita_iva = case when p_payload ? 'partita_iva' then p_payload->>'partita_iva' else partita_iva end,
    codice_fiscale = case when p_payload ? 'codice_fiscale' then p_payload->>'codice_fiscale' else codice_fiscale end,
    pec = case when p_payload ? 'pec' then p_payload->>'pec' else pec end,
    codice_destinatario = case when p_payload ? 'codice_destinatario' then p_payload->>'codice_destinatario' else codice_destinatario end,
    updated_at = now()
  where id = p_id and company_id = public.rbac_user_company_id();
  if not found then raise exception 'Fornitore not found'; end if;
exception
  when unique_violation then
    raise exception 'Identificativo fiscale già associato a un''altra anagrafica.';
end;
$$;

create or replace function public.admin_archive_fornitore(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_master_data_rbac_can('write') then raise exception 'Forbidden'; end if;
  perform set_config('admin.master_data_ssot', 'true', true);
  update public.fornitori_anagrafiche
  set is_active = false, archived_at = now()
  where id = p_id and company_id = public.rbac_user_company_id();
  if not found then raise exception 'Fornitore not found'; end if;
end;
$$;

create or replace function public.admin_list_master_data_conflicts(p_status text default null)
returns setof public.admin_master_data_conflicts
language sql
stable
security definer
set search_path = public
as $$
  select * from public.admin_master_data_conflicts c
  where c.company_id = public.rbac_user_company_id()
    and public.admin_master_data_rbac_can('read')
    and (p_status is null or c.status = p_status);
$$;

grant execute on function public.admin_create_cliente(jsonb) to authenticated;
grant execute on function public.admin_update_cliente(uuid, jsonb) to authenticated;
grant execute on function public.admin_archive_cliente(uuid) to authenticated;
grant execute on function public.admin_create_fornitore(jsonb) to authenticated;
grant execute on function public.admin_update_fornitore(uuid, jsonb) to authenticated;
grant execute on function public.admin_archive_fornitore(uuid) to authenticated;
grant execute on function public.admin_list_master_data_conflicts(text) to authenticated;

commit;
