-- FASE 7 — Populate vat_movements from consolidated invoice on accounting post.
begin;

create or replace function public.vat_sync_movements_from_invoice(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry record;
  v_row record;
  v_line_id uuid;
begin
  select * into v_entry from public.accounting_entries where id = p_entry_id;
  if not found or v_entry.invoice_id is null then
    return;
  end if;

  for v_row in
    select r.*
    from public.invoice_rows r
    where r.invoice_id = v_entry.invoice_id
      and r.vat_snapshot is not null
  loop
    select l.id into v_line_id
    from public.accounting_entry_lines l
    where l.entry_id = p_entry_id
      and l.account_id = v_row.vat_account_id
    limit 1;

    if v_line_id is null then
      continue;
    end if;

    insert into public.vat_movements (
      company_id, entry_id, entry_line_id, vat_code_id,
      vat_code_snapshot, vat_rate_snapshot, vat_nature_snapshot,
      taxable_amount, tax_amount, registry_id
    )
    values (
      v_entry.company_id,
      p_entry_id,
      v_line_id,
      v_row.vat_code_id,
      coalesce(v_row.vat_code, ''),
      coalesce(v_row.vat_rate, 0),
      v_row.vat_nature,
      abs(v_row.imponibile),
      abs(v_row.iva),
      v_row.vat_register_id
    );
  end loop;
end;
$$;

-- Extend accounting_post_entry: sync VAT movements after post
create or replace function public.accounting_post_entry(p_entry_id uuid, p_idempotency_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_company uuid := public.rbac_user_company_id();
  v_entry record;
  v_fiscal_year integer;
  v_next_number integer;
  v_existing uuid;
  v_competence date;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('post') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select id into v_existing
    from public.accounting_entries
    where company_id = v_company and idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('id', v_existing, 'idempotent', true);
    end if;
  end if;

  select * into v_entry from public.accounting_entries
  where id = p_entry_id and company_id = v_company
  for update;

  if not found then raise exception 'Entry not found'; end if;
  if v_entry.status <> 'draft' then raise exception 'Only draft entries can be posted'; end if;

  v_competence := coalesce(v_entry.competence_date, v_entry.entry_date);
  perform public.accounting_assert_period_open_for_posting(v_company, v_competence);

  select fy.year into v_fiscal_year
  from public.accounting_fiscal_years fy
  where fy.id = v_entry.fiscal_year_id;

  perform set_config('accounting.write_ssot', 'true', true);
  perform set_config('accounting.audit_ssot', 'true', true);

  insert into public.accounting_journal_sequences (company_id, journal_id, fiscal_year, last_number)
  values (v_company, v_entry.journal_id, v_fiscal_year, 0)
  on conflict (journal_id, fiscal_year) do nothing;

  select last_number into v_next_number
  from public.accounting_journal_sequences
  where journal_id = v_entry.journal_id and fiscal_year = v_fiscal_year
  for update;

  v_next_number := v_next_number + 1;

  update public.accounting_journal_sequences
  set last_number = v_next_number, updated_at = now()
  where journal_id = v_entry.journal_id and fiscal_year = v_fiscal_year;

  update public.accounting_entry_lines l
  set account_code_snapshot = coalesce(a.code, l.account_code)
  from public.accounting_accounts a
  where l.entry_id = p_entry_id and a.id = l.account_id;

  update public.accounting_entry_lines
  set account_code_snapshot = account_code
  where entry_id = p_entry_id and account_code_snapshot is null;

  update public.accounting_entries
  set status = 'posted',
      entry_number = v_next_number,
      fiscal_year = v_fiscal_year,
      idempotency_key = coalesce(p_idempotency_key, idempotency_key),
      updated_by = v_uid
  where id = p_entry_id;

  perform public.accounting_insert_audit_event(
    v_company, 'accounting_entry', p_entry_id, 'ENTRY_POSTED',
    'draft', 'posted', null,
    jsonb_build_object('entry_number', v_next_number, 'fiscal_year', v_fiscal_year)
  );

  perform public.vat_sync_movements_from_invoice(p_entry_id);

  perform set_config('accounting.write_ssot', 'false', true);
  perform set_config('accounting.audit_ssot', 'false', true);

  return jsonb_build_object(
    'id', p_entry_id,
    'status', 'posted',
    'entry_number', v_next_number,
    'fiscal_year', v_fiscal_year
  );
end;
$$;

revoke all on function public.vat_sync_movements_from_invoice(uuid) from public;
grant execute on function public.vat_sync_movements_from_invoice(uuid) to service_role;

commit;

notify pgrst, 'reload schema';
