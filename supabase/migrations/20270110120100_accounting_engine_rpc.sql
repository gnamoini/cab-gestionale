-- FASE 3 — Accounting engine RPC (transactional single-writer).
begin;

-- ponytail: RBAC helper until contabilita module fully wired in page access
create or replace function public.accounting_rbac_can(p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_role text;
  v_perm text;
begin
  if v_uid is null then
    return false;
  end if;

  v_role := lower(trim(public.rbac_role_for_user(v_uid)));
  if v_role = 'admin' then
    return true;
  end if;

  v_perm := 'contabilita.' || lower(trim(p_action));
  if public.rbac_role_has_permission(v_role, v_perm) then
    return true;
  end if;

  -- Transition: fatturazione write grants contabilita read/write
  if p_action in ('read', 'write', 'post', 'reverse', 'cancel') then
    return public.rbac_module_can('fatturazione', case when p_action = 'read' then 'read' else 'write' end);
  end if;

  return false;
end;
$$;

create or replace function public.accounting_assert_periods_open(
  p_company_id uuid,
  p_fiscal_period_id uuid,
  p_accounting_period_id uuid,
  p_competence_date date
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_fp record;
  v_ap record;
begin
  if p_fiscal_period_id is not null then
    select * into v_fp from public.fiscal_periods
    where id = p_fiscal_period_id and company_id = p_company_id;
    if not found then
      raise exception 'Fiscal period not found';
    end if;
    if v_fp.status in ('closed', 'locked') then
      raise exception 'Fiscal period is %', v_fp.status;
    end if;
    if p_competence_date < v_fp.start_date or p_competence_date > v_fp.end_date then
      raise exception 'Competence date outside fiscal period';
    end if;
  end if;

  if p_accounting_period_id is not null then
    select * into v_ap from public.accounting_periods
    where id = p_accounting_period_id and company_id = p_company_id;
    if not found then
      raise exception 'Accounting period not found';
    end if;
    if v_ap.status in ('closed', 'locked') then
      raise exception 'Accounting period is %', v_ap.status;
    end if;
    if p_competence_date < v_ap.start_date or p_competence_date > v_ap.end_date then
      raise exception 'Competence date outside accounting period';
    end if;
  end if;
end;
$$;

create or replace function public.accounting_validate_lines(p_lines jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_line jsonb;
  v_debit numeric(14, 2);
  v_credit numeric(14, 2);
  v_total_debit numeric(14, 2) := 0;
  v_total_credit numeric(14, 2) := 0;
  v_count integer := 0;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 then
    raise exception 'At least 2 lines required';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_count := v_count + 1;
    v_debit := coalesce((v_line->>'debit')::numeric, 0);
    v_credit := coalesce((v_line->>'credit')::numeric, 0);

    if v_debit < 0 or v_credit < 0 then
      raise exception 'Negative amounts not allowed';
    end if;
    if v_debit > 0 and v_credit > 0 then
      raise exception 'Line cannot have both debit and credit';
    end if;
    if v_debit = 0 and v_credit = 0 then
      raise exception 'Line must have debit or credit';
    end if;

    v_total_debit := v_total_debit + v_debit;
    v_total_credit := v_total_credit + v_credit;
  end loop;

  if v_total_debit <> v_total_credit then
    raise exception 'Entry unbalanced: debit=% credit=%', v_total_debit, v_total_credit;
  end if;
end;
$$;

create or replace function public.accounting_create_entry(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_company uuid := public.rbac_user_company_id();
  v_entry_id uuid;
  v_line jsonb;
  v_line_no integer := 0;
  v_account_id uuid;
  v_account_code text;
  v_journal_id uuid;
  v_cause_id uuid;
  v_fiscal_period_id uuid;
  v_accounting_period_id uuid;
  v_competence date;
  v_registration date;
  v_lines jsonb;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('write') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;
  if v_company is null then
    raise exception 'Company not configured';
  end if;

  v_journal_id := (p_payload->>'journal_id')::uuid;
  v_cause_id := nullif(p_payload->>'cause_id', '')::uuid;
  v_fiscal_period_id := nullif(p_payload->>'fiscal_period_id', '')::uuid;
  v_accounting_period_id := nullif(p_payload->>'accounting_period_id', '')::uuid;
  v_competence := coalesce((p_payload->>'competence_date')::date, current_date);
  v_registration := coalesce((p_payload->>'registration_date')::date, current_date);
  v_lines := p_payload->'lines';

  if v_journal_id is null then
    raise exception 'journal_id required';
  end if;

  if not exists (
    select 1 from public.accounting_journals j
    where j.id = v_journal_id and j.company_id = v_company and j.active
  ) then
    raise exception 'Invalid journal';
  end if;

  perform public.accounting_assert_periods_open(v_company, v_fiscal_period_id, v_accounting_period_id, v_competence);
  perform public.accounting_validate_lines(v_lines);

  perform set_config('accounting.write_ssot', 'true', true);

  insert into public.accounting_entries (
    company_id, journal_id, cause_id, fiscal_period_id, accounting_period_id,
    entry_date, competence_date, registration_date, description,
    source_type, source_id, invoice_id, status, entry_origin,
    idempotency_key, created_by, updated_by
  ) values (
    v_company, v_journal_id, v_cause_id, v_fiscal_period_id, v_accounting_period_id,
    v_competence, v_competence, v_registration,
    coalesce(p_payload->>'description', ''),
    nullif(p_payload->>'source_type', ''),
    nullif(p_payload->>'source_id', '')::uuid,
    nullif(p_payload->>'invoice_id', '')::uuid,
    'draft',
    coalesce(nullif(p_payload->>'entry_origin', ''), 'manual'),
    nullif(p_payload->>'idempotency_key', ''),
    v_uid, v_uid
  )
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(v_lines)
  loop
    v_line_no := v_line_no + 1;
    v_account_id := nullif(v_line->>'account_id', '')::uuid;
    v_account_code := v_line->>'account_code';

    if v_account_id is not null then
      select a.code into v_account_code
      from public.accounting_accounts a
      where a.id = v_account_id and a.company_id = v_company and a.active;
      if v_account_code is null then
        raise exception 'Invalid account_id %', v_account_id;
      end if;
    elsif v_account_code is null or trim(v_account_code) = '' then
      raise exception 'account_id or account_code required on line %', v_line_no;
    end if;

    insert into public.accounting_entry_lines (
      entry_id, account_id, line_number, account_code, description, debit, credit
    ) values (
      v_entry_id, v_account_id, v_line_no, v_account_code,
      nullif(v_line->>'description', ''),
      coalesce((v_line->>'debit')::numeric, 0),
      coalesce((v_line->>'credit')::numeric, 0)
    );
  end loop;

  perform set_config('accounting.write_ssot', 'false', true);

  return jsonb_build_object('id', v_entry_id, 'status', 'draft');
end;
$$;

create or replace function public.accounting_update_entry(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_company uuid := public.rbac_user_company_id();
  v_entry_id uuid := (p_payload->>'id')::uuid;
  v_entry record;
  v_line jsonb;
  v_line_no integer := 0;
  v_account_id uuid;
  v_account_code text;
  v_lines jsonb;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('write') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select * into v_entry from public.accounting_entries
  where id = v_entry_id and company_id = v_company
  for update;

  if not found then raise exception 'Entry not found'; end if;
  if v_entry.status <> 'draft' then raise exception 'Only draft entries can be edited'; end if;

  v_lines := p_payload->'lines';
  perform public.accounting_validate_lines(v_lines);

  perform set_config('accounting.write_ssot', 'true', true);

  update public.accounting_entries
  set description = coalesce(p_payload->>'description', description),
      competence_date = coalesce((p_payload->>'competence_date')::date, competence_date),
      registration_date = coalesce((p_payload->>'registration_date')::date, registration_date),
      entry_date = coalesce((p_payload->>'competence_date')::date, entry_date),
      journal_id = coalesce((p_payload->>'journal_id')::uuid, journal_id),
      cause_id = coalesce(nullif(p_payload->>'cause_id', '')::uuid, cause_id),
      updated_by = v_uid
  where id = v_entry_id;

  delete from public.accounting_entry_lines where entry_id = v_entry_id;

  for v_line in select * from jsonb_array_elements(v_lines)
  loop
    v_line_no := v_line_no + 1;
    v_account_id := nullif(v_line->>'account_id', '')::uuid;
    v_account_code := v_line->>'account_code';

    if v_account_id is not null then
      select a.code into v_account_code from public.accounting_accounts a
      where a.id = v_account_id and a.company_id = v_company and a.active;
      if v_account_code is null then raise exception 'Invalid account'; end if;
    end if;

    insert into public.accounting_entry_lines (
      entry_id, account_id, line_number, account_code, description, debit, credit
    ) values (
      v_entry_id, v_account_id, v_line_no, v_account_code,
      nullif(v_line->>'description', ''),
      coalesce((v_line->>'debit')::numeric, 0),
      coalesce((v_line->>'credit')::numeric, 0)
    );
  end loop;

  perform set_config('accounting.write_ssot', 'false', true);
  return jsonb_build_object('id', v_entry_id, 'status', 'draft');
end;
$$;

create or replace function public.accounting_get_entry(p_entry_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company uuid := public.rbac_user_company_id();
  v_entry jsonb;
  v_lines jsonb;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('read') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select to_jsonb(e.*) into v_entry
  from public.accounting_entries e
  where e.id = p_entry_id and e.company_id = v_company;

  if v_entry is null then raise exception 'Entry not found'; end if;

  select coalesce(jsonb_agg(to_jsonb(l.*) order by l.line_number nulls last, l.created_at), '[]'::jsonb)
  into v_lines
  from public.accounting_entry_lines l
  where l.entry_id = p_entry_id;

  return v_entry || jsonb_build_object('lines', v_lines);
end;
$$;

create or replace function public.accounting_list_entries(p_filters jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company uuid := public.rbac_user_company_id();
  v_status text := nullif(p_filters->>'status', '');
  v_limit integer := least(coalesce((p_filters->>'limit')::integer, 50), 200);
  v_offset integer := coalesce((p_filters->>'offset')::integer, 0);
  v_items jsonb;
  v_total bigint;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('read') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select count(*) into v_total
  from public.accounting_entries e
  where e.company_id = v_company
    and (v_status is null or e.status = v_status);

  select coalesce(jsonb_agg(to_jsonb(e.*) order by e.created_at desc), '[]'::jsonb)
  into v_items
  from (
    select * from public.accounting_entries e
    where e.company_id = v_company
      and (v_status is null or e.status = v_status)
    order by e.created_at desc
    limit v_limit offset v_offset
  ) e;

  return jsonb_build_object('items', v_items, 'total', v_total, 'limit', v_limit, 'offset', v_offset);
end;
$$;

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

  v_fiscal_year := coalesce(v_entry.fiscal_year, extract(year from coalesce(v_entry.competence_date, v_entry.entry_date))::integer);

  perform public.accounting_assert_periods_open(
    v_company, v_entry.fiscal_period_id, v_entry.accounting_period_id,
    coalesce(v_entry.competence_date, v_entry.entry_date)
  );

  perform set_config('accounting.write_ssot', 'true', true);

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

  perform set_config('accounting.write_ssot', 'false', true);

  return jsonb_build_object(
    'id', p_entry_id,
    'status', 'posted',
    'entry_number', v_next_number,
    'fiscal_year', v_fiscal_year
  );
end;
$$;

create or replace function public.accounting_cancel_entry(p_entry_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := public.rbac_user_company_id();
  v_status text;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('cancel') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select status into v_status from public.accounting_entries
  where id = p_entry_id and company_id = v_company for update;

  if not found then raise exception 'Entry not found'; end if;
  if v_status <> 'draft' then raise exception 'Only draft entries can be cancelled'; end if;

  perform set_config('accounting.write_ssot', 'true', true);

  update public.accounting_entries
  set status = 'cancelled',
      description = case when p_reason is not null and p_reason <> ''
        then description || ' [cancelled: ' || left(p_reason, 200) || ']'
        else description end,
      updated_by = public.rbac_auth_uid()
  where id = p_entry_id;

  perform set_config('accounting.write_ssot', 'false', true);
  return jsonb_build_object('id', p_entry_id, 'status', 'cancelled');
end;
$$;

create or replace function public.accounting_reverse_entry(
  p_entry_id uuid,
  p_reason text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_company uuid := public.rbac_user_company_id();
  v_original record;
  v_reversal_id uuid;
  v_line record;
  v_line_no integer := 0;
  v_post_result jsonb;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('reverse') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select * into v_original from public.accounting_entries
  where id = p_entry_id and company_id = v_company for update;

  if not found then raise exception 'Entry not found'; end if;
  if v_original.status <> 'posted' then raise exception 'Only posted entries can be reversed'; end if;

  perform set_config('accounting.write_ssot', 'true', true);

  insert into public.accounting_entries (
    company_id, journal_id, cause_id, fiscal_period_id, accounting_period_id,
    entry_date, competence_date, registration_date, description,
    source_type, source_id, invoice_id, status, entry_origin,
    reverses_entry_id, idempotency_key, created_by, updated_by
  ) values (
    v_company, v_original.journal_id, v_original.cause_id,
    v_original.fiscal_period_id, v_original.accounting_period_id,
    current_date, current_date, current_date,
    coalesce('Storno: ' || left(v_original.description, 500), 'Storno'),
    v_original.source_type, v_original.source_id, v_original.invoice_id,
    'draft', 'reversed', p_entry_id, p_idempotency_key, v_uid, v_uid
  )
  returning id into v_reversal_id;

  for v_line in
    select * from public.accounting_entry_lines
    where entry_id = p_entry_id
    order by line_number nulls last, created_at
  loop
    v_line_no := v_line_no + 1;
    insert into public.accounting_entry_lines (
      entry_id, account_id, line_number, account_code, description, debit, credit
    ) values (
      v_reversal_id, v_line.account_id, v_line_no, v_line.account_code,
      v_line.description,
      v_line.credit,
      v_line.debit
    );
  end loop;

  perform set_config('accounting.write_ssot', 'false', true);

  v_post_result := public.accounting_post_entry(v_reversal_id, p_idempotency_key);

  perform set_config('accounting.write_ssot', 'true', true);
  update public.accounting_entries
  set status = 'reversed', reversed_by_entry_id = v_reversal_id, updated_by = v_uid
  where id = p_entry_id;
  perform set_config('accounting.write_ssot', 'false', true);

  return jsonb_build_object(
    'original_id', p_entry_id,
    'reversal_id', v_reversal_id,
    'reversal', v_post_result,
    'status', 'reversed'
  );
end;
$$;

revoke all on function public.accounting_rbac_can(text) from public, anon;
grant execute on function public.accounting_rbac_can(text) to authenticated, service_role;

revoke all on function public.accounting_create_entry(jsonb) from public, anon;
grant execute on function public.accounting_create_entry(jsonb) to authenticated, service_role;

revoke all on function public.accounting_update_entry(jsonb) from public, anon;
grant execute on function public.accounting_update_entry(jsonb) to authenticated, service_role;

revoke all on function public.accounting_get_entry(uuid) from public, anon;
grant execute on function public.accounting_get_entry(uuid) to authenticated, service_role;

revoke all on function public.accounting_list_entries(jsonb) from public, anon;
grant execute on function public.accounting_list_entries(jsonb) to authenticated, service_role;

revoke all on function public.accounting_post_entry(uuid, text) from public, anon;
grant execute on function public.accounting_post_entry(uuid, text) to authenticated, service_role;

revoke all on function public.accounting_cancel_entry(uuid, text) from public, anon;
grant execute on function public.accounting_cancel_entry(uuid, text) to authenticated, service_role;

revoke all on function public.accounting_reverse_entry(uuid, text, text) from public, anon;
grant execute on function public.accounting_reverse_entry(uuid, text, text) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
