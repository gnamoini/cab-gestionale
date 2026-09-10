-- FASE 4 — Period resolution, entry RPC updates, period/fiscal RPCs, adjustment.
begin;

-- ---------------------------------------------------------------------------
-- Audit insert helper (internal)
-- ---------------------------------------------------------------------------
create or replace function public.accounting_insert_audit_event(
  p_company_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_event_type text,
  p_previous_state text default null,
  p_new_state text default null,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_correlation_id uuid default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.accounting_audit_events (
    company_id, actor_user_id, entity_type, entity_id,
    event_type, previous_state, new_state, reason, metadata, correlation_id
  ) values (
    p_company_id, public.rbac_auth_uid(), p_entity_type, p_entity_id,
    p_event_type, p_previous_state, p_new_state, p_reason, p_metadata, p_correlation_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- accounting_resolve_period — SSOT for competence_date → fiscal year + period
-- ---------------------------------------------------------------------------
create or replace function public.accounting_resolve_period(
  p_company_id uuid,
  p_accounting_date date
)
returns table (
  fiscal_year_id uuid,
  period_id uuid,
  fiscal_year_status text,
  period_status text,
  fiscal_year integer
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_fy_count integer;
  v_period_count integer;
  v_fy_id uuid;
  v_fy_status text;
  v_fy_year integer;
  v_period_id uuid;
  v_period_status text;
begin
  if p_company_id is null then
    raise exception 'company_id required';
  end if;
  if p_accounting_date is null then
    raise exception 'accounting_date required';
  end if;

  select count(*) into v_fy_count
  from public.accounting_fiscal_years fy
  where fy.company_id = p_company_id
    and p_accounting_date between fy.start_date and fy.end_date;

  if v_fy_count = 0 then
    raise exception 'No fiscal year found for date %', p_accounting_date;
  end if;
  if v_fy_count > 1 then
    raise exception 'Ambiguous fiscal year for date %', p_accounting_date;
  end if;

  select fy.id, fy.status, fy.year
  into v_fy_id, v_fy_status, v_fy_year
  from public.accounting_fiscal_years fy
  where fy.company_id = p_company_id
    and p_accounting_date between fy.start_date and fy.end_date;

  select count(*) into v_period_count
  from public.accounting_periods ap
  where ap.fiscal_year_id = v_fy_id
    and ap.company_id = p_company_id
    and p_accounting_date between ap.start_date and ap.end_date;

  if v_period_count = 0 then
    raise exception 'No accounting period found for date %', p_accounting_date;
  end if;
  if v_period_count > 1 then
    raise exception 'Ambiguous accounting period for date %', p_accounting_date;
  end if;

  select ap.id, ap.status into v_period_id, v_period_status
  from public.accounting_periods ap
  where ap.fiscal_year_id = v_fy_id
    and ap.company_id = p_company_id
    and p_accounting_date between ap.start_date and ap.end_date;

  return query
  select v_fy_id, v_period_id, v_fy_status, v_period_status, v_fy_year;
end;
$$;

-- ---------------------------------------------------------------------------
-- Period open assertion (replaces accounting_assert_periods_open)
-- ---------------------------------------------------------------------------
create or replace function public.accounting_assert_period_open_for_posting(
  p_company_id uuid,
  p_accounting_date date
)
returns void
language plpgsql
set search_path = public
as $$
declare
  r record;
begin
  select * into r
  from public.accounting_resolve_period(p_company_id, p_accounting_date);

  if r.fiscal_year_status <> 'OPEN' then
    raise exception 'Fiscal year is %', r.fiscal_year_status;
  end if;
  if r.period_status <> 'OPEN' then
    raise exception 'Accounting period is %', r.period_status;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- accounting_create_entry — server-side period resolve
-- ---------------------------------------------------------------------------
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
  v_competence date;
  v_registration date;
  v_lines jsonb;
  v_resolved record;
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
  v_competence := coalesce((p_payload->>'competence_date')::date, current_date);
  v_registration := coalesce((p_payload->>'registration_date')::date, v_competence);
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

  select * into v_resolved
  from public.accounting_resolve_period(v_company, v_competence);

  perform public.accounting_assert_period_open_for_posting(v_company, v_competence);
  perform public.accounting_validate_lines(v_lines);

  perform set_config('accounting.write_ssot', 'true', true);

  insert into public.accounting_entries (
    company_id, journal_id, cause_id, fiscal_year_id, period_id,
    entry_date, competence_date, registration_date, description,
    source_type, source_id, invoice_id, status, entry_origin, entry_kind,
    idempotency_key, created_by, updated_by
  ) values (
    v_company, v_journal_id, v_cause_id, v_resolved.fiscal_year_id, v_resolved.period_id,
    v_competence, v_competence, v_registration,
    coalesce(p_payload->>'description', ''),
    nullif(p_payload->>'source_type', ''),
    nullif(p_payload->>'source_id', '')::uuid,
    nullif(p_payload->>'invoice_id', '')::uuid,
    'draft',
    coalesce(nullif(p_payload->>'entry_origin', ''), 'manual'),
    coalesce(nullif(p_payload->>'entry_kind', ''), 'normal'),
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

  return jsonb_build_object(
    'id', v_entry_id,
    'status', 'draft',
    'fiscal_year_id', v_resolved.fiscal_year_id,
    'period_id', v_resolved.period_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- accounting_update_entry — re-resolve on competence_date change
-- ---------------------------------------------------------------------------
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
  v_competence date;
  v_registration date;
  v_resolved record;
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

  v_competence := coalesce((p_payload->>'competence_date')::date, v_entry.competence_date);
  v_registration := coalesce((p_payload->>'registration_date')::date, v_entry.registration_date);
  v_lines := p_payload->'lines';

  select * into v_resolved
  from public.accounting_resolve_period(v_company, v_competence);

  perform public.accounting_assert_period_open_for_posting(v_company, v_competence);
  perform public.accounting_validate_lines(v_lines);

  perform set_config('accounting.write_ssot', 'true', true);

  update public.accounting_entries
  set description = coalesce(p_payload->>'description', description),
      competence_date = v_competence,
      registration_date = v_registration,
      entry_date = v_competence,
      journal_id = coalesce((p_payload->>'journal_id')::uuid, journal_id),
      cause_id = coalesce(nullif(p_payload->>'cause_id', '')::uuid, cause_id),
      fiscal_year_id = v_resolved.fiscal_year_id,
      period_id = v_resolved.period_id,
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
  return jsonb_build_object(
    'id', v_entry_id,
    'status', 'draft',
    'fiscal_year_id', v_resolved.fiscal_year_id,
    'period_id', v_resolved.period_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- accounting_post_entry — verify resolved period still OPEN
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- accounting_reverse_entry — explicit p_reversal_date, period of reversal
-- ---------------------------------------------------------------------------
create or replace function public.accounting_reverse_entry(
  p_entry_id uuid,
  p_reversal_date date,
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
  v_resolved record;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('reverse') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  if p_reversal_date is null then
    raise exception 'p_reversal_date is required';
  end if;

  select * into v_original from public.accounting_entries
  where id = p_entry_id and company_id = v_company for update;

  if not found then raise exception 'Entry not found'; end if;
  if v_original.status <> 'posted' then raise exception 'Only posted entries can be reversed'; end if;
  if v_original.reversed_by_entry_id is not null then
    raise exception 'Entry already reversed';
  end if;

  select * into v_resolved
  from public.accounting_resolve_period(v_company, p_reversal_date);

  perform public.accounting_assert_period_open_for_posting(v_company, p_reversal_date);

  perform set_config('accounting.write_ssot', 'true', true);
  perform set_config('accounting.audit_ssot', 'true', true);

  insert into public.accounting_entries (
    company_id, journal_id, cause_id, fiscal_year_id, period_id,
    entry_date, competence_date, registration_date, description,
    source_type, source_id, invoice_id, status, entry_origin, entry_kind,
    reverses_entry_id, idempotency_key, created_by, updated_by
  ) values (
    v_company, v_original.journal_id, v_original.cause_id,
    v_resolved.fiscal_year_id, v_resolved.period_id,
    p_reversal_date, p_reversal_date, p_reversal_date,
    coalesce('Storno: ' || left(v_original.description, 500), 'Storno'),
    v_original.source_type, v_original.source_id, v_original.invoice_id,
    'draft', 'reversed', 'reversal',
    p_entry_id, p_idempotency_key, v_uid, v_uid
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

  perform public.accounting_insert_audit_event(
    v_company, 'accounting_entry', p_entry_id, 'ENTRY_REVERSED',
    'posted', 'reversed', p_reason,
    jsonb_build_object(
      'reversal_id', v_reversal_id,
      'reversal_date', p_reversal_date,
      'original_period_id', v_original.period_id
    )
  );

  perform set_config('accounting.write_ssot', 'false', true);
  perform set_config('accounting.audit_ssot', 'false', true);

  return jsonb_build_object(
    'original_id', p_entry_id,
    'reversal_id', v_reversal_id,
    'reversal', v_post_result,
    'status', 'reversed',
    'reversal_date', p_reversal_date
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- accounting_create_adjustment_entry
-- ---------------------------------------------------------------------------
create or replace function public.accounting_create_adjustment_entry(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_company uuid := public.rbac_user_company_id();
  v_corrects_id uuid;
  v_original record;
  v_adjustment_date date;
  v_resolved record;
  v_entry_id uuid;
  v_line jsonb;
  v_line_no integer := 0;
  v_account_id uuid;
  v_account_code text;
  v_lines jsonb;
  v_post_result jsonb;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('adjust') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;
  if v_company is null then raise exception 'Company not configured'; end if;

  v_corrects_id := (p_payload->>'corrects_entry_id')::uuid;
  v_adjustment_date := (p_payload->>'adjustment_date')::date;

  if v_corrects_id is null then raise exception 'corrects_entry_id required'; end if;
  if v_adjustment_date is null then raise exception 'adjustment_date required'; end if;

  select * into v_original from public.accounting_entries
  where id = v_corrects_id and company_id = v_company;

  if not found then raise exception 'Original entry not found'; end if;
  if v_original.status not in ('posted', 'reversed') then
    raise exception 'Can only adjust posted or reversed entries';
  end if;

  select * into v_resolved
  from public.accounting_resolve_period(v_company, v_adjustment_date);

  perform public.accounting_assert_period_open_for_posting(v_company, v_adjustment_date);

  v_lines := p_payload->'lines';
  perform public.accounting_validate_lines(v_lines);

  perform set_config('accounting.write_ssot', 'true', true);
  perform set_config('accounting.audit_ssot', 'true', true);

  insert into public.accounting_entries (
    company_id, journal_id, cause_id, fiscal_year_id, period_id,
    entry_date, competence_date, registration_date, description,
    source_type, source_id, invoice_id, status, entry_origin, entry_kind,
    corrects_entry_id, idempotency_key, created_by, updated_by
  ) values (
    v_company,
    coalesce((p_payload->>'journal_id')::uuid, v_original.journal_id),
    coalesce(nullif(p_payload->>'cause_id', '')::uuid, v_original.cause_id),
    v_resolved.fiscal_year_id, v_resolved.period_id,
    v_adjustment_date, v_adjustment_date, v_adjustment_date,
    coalesce(p_payload->>'description', 'Rettifica'),
    v_original.source_type, v_original.source_id, v_original.invoice_id,
    'draft', 'manual', 'adjustment',
    v_corrects_id,
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

  v_post_result := public.accounting_post_entry(
    v_entry_id,
    nullif(p_payload->>'idempotency_key', '')
  );

  perform set_config('accounting.audit_ssot', 'true', true);
  perform public.accounting_insert_audit_event(
    v_company, 'accounting_entry', v_entry_id, 'ENTRY_ADJUSTED',
    null, 'posted', p_payload->>'reason',
    jsonb_build_object(
      'corrects_entry_id', v_corrects_id,
      'adjustment_date', v_adjustment_date
    )
  );
  perform set_config('accounting.audit_ssot', 'false', true);

  return jsonb_build_object(
    'id', v_entry_id,
    'corrects_entry_id', v_corrects_id,
    'post', v_post_result
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Period / fiscal year management RPCs
-- ---------------------------------------------------------------------------
create or replace function public.accounting_open_fiscal_year(
  p_year integer,
  p_start_date date default null,
  p_end_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_company uuid := public.rbac_user_company_id();
  v_start date;
  v_end date;
  v_fy_id uuid;
  v_month integer;
  v_names text[] := array[
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  v_mstart date;
  v_mend date;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('fiscal_year_open') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  v_start := coalesce(p_start_date, make_date(p_year, 1, 1));
  v_end := coalesce(p_end_date, make_date(p_year, 12, 31));

  perform set_config('accounting.period_ssot', 'true', true);
  perform set_config('accounting.audit_ssot', 'true', true);

  insert into public.accounting_fiscal_years (
    company_id, year, start_date, end_date, status, opened_at, opened_by
  ) values (
    v_company, p_year, v_start, v_end, 'OPEN', now(), v_uid
  )
  returning id into v_fy_id;

  for v_month in 1..12 loop
    v_mstart := make_date(p_year, v_month, 1);
    v_mend := (v_mstart + interval '1 month' - interval '1 day')::date;
    insert into public.accounting_periods (
      fiscal_year_id, company_id, period_number, name,
      start_date, end_date, status, opened_at, opened_by
    ) values (
      v_fy_id, v_company, v_month, v_names[v_month] || ' ' || p_year::text,
      greatest(v_mstart, v_start), least(v_mend, v_end),
      'OPEN', now(), v_uid
    );
  end loop;

  perform public.accounting_insert_audit_event(
    v_company, 'accounting_fiscal_year', v_fy_id, 'FISCAL_YEAR_OPENED',
    null, 'OPEN', null, jsonb_build_object('year', p_year)
  );

  perform set_config('accounting.period_ssot', 'false', true);
  perform set_config('accounting.audit_ssot', 'false', true);

  return jsonb_build_object('id', v_fy_id, 'year', p_year, 'status', 'OPEN');
end;
$$;

create or replace function public.accounting_close_fiscal_year(p_fiscal_year_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := public.rbac_user_company_id();
  v_fy record;
  v_open_count integer;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('fiscal_year_close') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select * into v_fy from public.accounting_fiscal_years
  where id = p_fiscal_year_id and company_id = v_company
  for update;

  if not found then raise exception 'Fiscal year not found'; end if;
  if v_fy.status <> 'OPEN' then raise exception 'Fiscal year is not OPEN'; end if;

  select count(*) into v_open_count
  from public.accounting_periods ap
  where ap.fiscal_year_id = p_fiscal_year_id and ap.status = 'OPEN';

  if v_open_count > 0 then
    raise exception 'Cannot close fiscal year: % period(s) still OPEN', v_open_count;
  end if;

  perform set_config('accounting.period_ssot', 'true', true);
  perform set_config('accounting.audit_ssot', 'true', true);

  update public.accounting_fiscal_years
  set status = 'CLOSED', closed_at = now(), closed_by = public.rbac_auth_uid()
  where id = p_fiscal_year_id;

  perform public.accounting_insert_audit_event(
    v_company, 'accounting_fiscal_year', p_fiscal_year_id, 'FISCAL_YEAR_CLOSED',
    'OPEN', 'CLOSED', null, '{}'::jsonb
  );

  perform set_config('accounting.period_ssot', 'false', true);
  perform set_config('accounting.audit_ssot', 'false', true);

  return jsonb_build_object('id', p_fiscal_year_id, 'status', 'CLOSED');
end;
$$;

create or replace function public.accounting_close_accounting_period(
  p_period_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := public.rbac_user_company_id();
  v_period record;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('period_close') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select ap.*, fy.status as fy_status into v_period
  from public.accounting_periods ap
  join public.accounting_fiscal_years fy on fy.id = ap.fiscal_year_id
  where ap.id = p_period_id and ap.company_id = v_company
  for update of ap;

  if not found then raise exception 'Period not found'; end if;
  if v_period.status <> 'OPEN' then raise exception 'Period is not OPEN'; end if;
  if v_period.fy_status <> 'OPEN' then raise exception 'Fiscal year is not OPEN'; end if;

  perform set_config('accounting.period_ssot', 'true', true);
  perform set_config('accounting.audit_ssot', 'true', true);

  update public.accounting_periods
  set status = 'CLOSED', closed_at = now(), closed_by = public.rbac_auth_uid()
  where id = p_period_id;

  perform public.accounting_insert_audit_event(
    v_company, 'accounting_period', p_period_id, 'PERIOD_CLOSED',
    'OPEN', 'CLOSED', p_reason,
    jsonb_build_object('period_number', v_period.period_number)
  );

  perform set_config('accounting.period_ssot', 'false', true);
  perform set_config('accounting.audit_ssot', 'false', true);

  return jsonb_build_object('id', p_period_id, 'status', 'CLOSED');
end;
$$;

create or replace function public.accounting_lock_accounting_period(
  p_period_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := public.rbac_user_company_id();
  v_period record;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('period_lock') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'lock reason required';
  end if;

  select * into v_period from public.accounting_periods
  where id = p_period_id and company_id = v_company
  for update;

  if not found then raise exception 'Period not found'; end if;
  if v_period.status <> 'CLOSED' then
    raise exception 'Period must be CLOSED before LOCKED (current: %)', v_period.status;
  end if;

  perform set_config('accounting.period_ssot', 'true', true);
  perform set_config('accounting.audit_ssot', 'true', true);

  update public.accounting_periods
  set status = 'LOCKED',
      locked_at = now(),
      locked_by = public.rbac_auth_uid(),
      lock_reason = left(p_reason, 500)
  where id = p_period_id;

  perform public.accounting_insert_audit_event(
    v_company, 'accounting_period', p_period_id, 'PERIOD_LOCKED',
    'CLOSED', 'LOCKED', p_reason,
    jsonb_build_object('period_number', v_period.period_number)
  );

  perform set_config('accounting.period_ssot', 'false', true);
  perform set_config('accounting.audit_ssot', 'false', true);

  return jsonb_build_object('id', p_period_id, 'status', 'LOCKED');
end;
$$;

create or replace function public.accounting_reopen_accounting_period(
  p_period_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := public.rbac_user_company_id();
  v_period record;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('period_reopen') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select ap.*, fy.status as fy_status into v_period
  from public.accounting_periods ap
  join public.accounting_fiscal_years fy on fy.id = ap.fiscal_year_id
  where ap.id = p_period_id and ap.company_id = v_company
  for update of ap;

  if not found then raise exception 'Period not found'; end if;
  if v_period.status = 'LOCKED' then
    raise exception 'LOCKED periods cannot be reopened';
  end if;
  if v_period.status <> 'CLOSED' then
    raise exception 'Only CLOSED periods can be reopened';
  end if;
  if v_period.fy_status <> 'OPEN' then
    raise exception 'Fiscal year must be OPEN to reopen period';
  end if;

  perform set_config('accounting.period_ssot', 'true', true);
  perform set_config('accounting.audit_ssot', 'true', true);

  update public.accounting_periods
  set status = 'OPEN',
      opened_at = now(),
      opened_by = public.rbac_auth_uid(),
      closed_at = null,
      closed_by = null
  where id = p_period_id;

  perform public.accounting_insert_audit_event(
    v_company, 'accounting_period', p_period_id, 'PERIOD_REOPENED',
    'CLOSED', 'OPEN', p_reason,
    jsonb_build_object('period_number', v_period.period_number)
  );

  perform set_config('accounting.period_ssot', 'false', true);
  perform set_config('accounting.audit_ssot', 'false', true);

  return jsonb_build_object('id', p_period_id, 'status', 'OPEN');
end;
$$;

-- List fiscal years + periods (read helper)
create or replace function public.accounting_list_fiscal_periods()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company uuid := public.rbac_user_company_id();
  v_result jsonb;
begin
  perform public.security_assert_authenticated();
  if not public.accounting_rbac_can('read') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    to_jsonb(fy) || jsonb_build_object(
      'periods', (
        select coalesce(jsonb_agg(to_jsonb(ap) order by ap.period_number), '[]'::jsonb)
        from public.accounting_periods ap
        where ap.fiscal_year_id = fy.id
      )
    )
    order by fy.year desc
  ), '[]'::jsonb)
  into v_result
  from public.accounting_fiscal_years fy
  where fy.company_id = v_company;

  return v_result;
end;
$$;

-- Grants for new/changed RPCs
revoke all on function public.accounting_resolve_period(uuid, date) from public, anon;
grant execute on function public.accounting_resolve_period(uuid, date) to authenticated, service_role;

revoke all on function public.accounting_create_adjustment_entry(jsonb) from public, anon;
grant execute on function public.accounting_create_adjustment_entry(jsonb) to authenticated, service_role;

revoke all on function public.accounting_open_fiscal_year(integer, date, date) from public, anon;
grant execute on function public.accounting_open_fiscal_year(integer, date, date) to authenticated, service_role;

revoke all on function public.accounting_close_fiscal_year(uuid) from public, anon;
grant execute on function public.accounting_close_fiscal_year(uuid) to authenticated, service_role;

revoke all on function public.accounting_close_accounting_period(uuid, text) from public, anon;
grant execute on function public.accounting_close_accounting_period(uuid, text) to authenticated, service_role;

revoke all on function public.accounting_lock_accounting_period(uuid, text) from public, anon;
grant execute on function public.accounting_lock_accounting_period(uuid, text) to authenticated, service_role;

revoke all on function public.accounting_reopen_accounting_period(uuid, text) from public, anon;
grant execute on function public.accounting_reopen_accounting_period(uuid, text) to authenticated, service_role;

revoke all on function public.accounting_list_fiscal_periods() from public, anon;
grant execute on function public.accounting_list_fiscal_periods() to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
