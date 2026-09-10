-- FASE 7 — VAT Engine RPC (resolution, calculation, validation, admin).
begin;

-- ---------------------------------------------------------------------------
-- Validate operation_type + nature + rate combination (no rate-only inference)
-- ---------------------------------------------------------------------------
create or replace function public.vat_validate_configuration_combo(
  p_operation_type_code text,
  p_nature_code text,
  p_rate numeric,
  p_direction text
)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_rate is null or p_rate < 0 then
    raise exception 'VAT_RATE_INVALID';
  end if;

  if p_operation_type_code = 'IMPONIBILE' then
    if p_rate <= 0 then
      raise exception 'VAT_RATE_MISMATCH';
    end if;
    if p_nature_code is not null then
      raise exception 'VAT_NATURE_NOT_ALLOWED';
    end if;
  elsif p_operation_type_code in ('ESENTE', 'NON_IMPONIBILE', 'NON_SOGGETTA') then
    if p_nature_code is null then
      raise exception 'VAT_NATURE_REQUIRED';
    end if;
  elsif p_operation_type_code = 'REVERSE_CHARGE' then
    if p_nature_code is null or p_nature_code not like 'N6.%' then
      raise exception 'VAT_NATURE_REQUIRED';
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Resolve VAT configuration
-- payload: { vat_code_id?, vat_code?, operation_date, direction, company_id? }
-- ---------------------------------------------------------------------------
create or replace function public.vat_resolve_configuration(p_payload jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid := coalesce((p_payload->>'company_id')::uuid, public.rbac_user_company_id());
  v_code_id uuid := nullif(p_payload->>'vat_code_id', '')::uuid;
  v_code text := nullif(trim(p_payload->>'vat_code'), '');
  v_operation_date date := coalesce((p_payload->>'operation_date')::date, current_date);
  v_direction text := lower(coalesce(nullif(trim(p_payload->>'direction'), ''), 'sales'));
  v_cfg record;
  v_op_code text;
  v_nat_code text;
begin
  if v_company_id is null then
    raise exception 'VAT_CONFIGURATION_INVALID';
  end if;

  if v_direction not in ('sales', 'purchase', 'both') then
    raise exception 'VAT_CODE_NOT_VALID_FOR_OPERATION';
  end if;

  if v_code_id is null and v_code is not null then
    select id into v_code_id
    from public.vat_codes
    where company_id = v_company_id and code = v_code and active = true;
  end if;

  if v_code_id is null then
    raise exception 'VAT_CODE_MISSING';
  end if;

  select
    c.*,
    vc.code as vat_code,
    ot.code as operation_type_code,
    n.code as nature_code
  into v_cfg
  from public.vat_code_configurations c
  join public.vat_codes vc on vc.id = c.vat_code_id
  join public.vat_operation_types ot on ot.id = c.operation_type_id
  left join public.vat_natures n on n.id = c.nature_id
  where c.company_id = v_company_id
    and c.vat_code_id = v_code_id
    and c.active = true
    and c.valid_from <= v_operation_date
    and (c.valid_to is null or v_operation_date <= c.valid_to)
    and (
      c.direction = v_direction
      or c.direction = 'both'
    )
  order by
    case when c.direction = v_direction then 0 else 1 end,
    c.valid_from desc
  limit 1;

  if not found then
    raise exception 'VAT_CODE_EXPIRED';
  end if;

  perform public.vat_validate_configuration_combo(
    v_cfg.operation_type_code,
    v_cfg.nature_code,
    v_cfg.rate,
    v_cfg.direction
  );

  return jsonb_build_object(
    'configuration_id', v_cfg.id,
    'vat_code_id', v_cfg.vat_code_id,
    'vat_code', v_cfg.vat_code,
    'description', v_cfg.description,
    'rate', v_cfg.rate,
    'nature_code', v_cfg.nature_code,
    'operation_type_code', v_cfg.operation_type_code,
    'direction', v_cfg.direction,
    'deductibility_rate', v_cfg.deductibility_rate,
    'vat_account_id', v_cfg.vat_account_id,
    'vat_register_id', v_cfg.vat_register_id,
    'valid_from', v_cfg.valid_from,
    'valid_to', v_cfg.valid_to,
    'normative_reference', v_cfg.normative_reference
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Calculate single line amounts
-- payload: { configuration: {...}, quantita, prezzo_unitario, sconto_percent?, sign? }
-- ---------------------------------------------------------------------------
create or replace function public.vat_calculate_line(p_payload jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_cfg jsonb := p_payload->'configuration';
  v_qty numeric := greatest(coalesce((p_payload->>'quantita')::numeric, 0), 0);
  v_price numeric := greatest(coalesce((p_payload->>'prezzo_unitario')::numeric, 0), 0);
  v_discount numeric := least(100, greatest(coalesce((p_payload->>'sconto_percent')::numeric, 0), 0));
  v_sign numeric := case when coalesce((p_payload->>'sign')::integer, 1) < 0 then -1 else 1 end;
  v_rate numeric := coalesce((v_cfg->>'rate')::numeric, 0);
  v_op text := v_cfg->>'operation_type_code';
  v_imponibile numeric;
  v_iva numeric;
  v_deduct numeric;
  v_deduct_rate numeric := coalesce((v_cfg->>'deductibility_rate')::numeric, 0);
begin
  v_imponibile := round(v_qty * v_price * (1 - v_discount / 100), 2) * v_sign;

  if v_op = 'IMPONIBILE' and v_rate > 0 then
    v_iva := round(v_imponibile * v_rate / 100, 2);
  else
    v_iva := 0;
  end if;

  v_deduct := round(v_iva * v_deduct_rate / 100, 2);

  return jsonb_build_object(
    'taxable_amount', v_imponibile,
    'vat_rate', v_rate,
    'vat_nature', v_cfg->>'nature_code',
    'vat_amount', v_iva,
    'gross_amount', round(v_imponibile + v_iva, 2),
    'deductible_vat_amount', v_deduct,
    'non_deductible_vat_amount', round(v_iva - v_deduct, 2)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Build immutable snapshot for document row (version 1)
-- ---------------------------------------------------------------------------
create or replace function public.vat_build_row_snapshot(
  p_configuration jsonb,
  p_calculated jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
begin
  return jsonb_build_object(
    'snapshot_version', 1,
    'vat_code_id', p_configuration->>'vat_code_id',
    'vat_configuration_id', p_configuration->>'configuration_id',
    'vat_code', p_configuration->>'vat_code',
    'description', p_configuration->>'description',
    'rate', p_configuration->>'rate',
    'nature_code', p_configuration->>'nature_code',
    'operation_type_code', p_configuration->>'operation_type_code',
    'direction', p_configuration->>'direction',
    'deductibility_rate', p_configuration->>'deductibility_rate',
    'vat_account_id', p_configuration->>'vat_account_id',
    'vat_register_id', p_configuration->>'vat_register_id',
    'valid_from', p_configuration->>'valid_from',
    'valid_to', p_configuration->>'valid_to',
    'normative_reference', p_configuration->>'normative_reference',
    'calculated', p_calculated
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Apply snapshot columns to invoice row record fields
-- ---------------------------------------------------------------------------
create or replace function public.vat_apply_row_snapshot(
  p_configuration jsonb,
  p_calculated jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_snap jsonb;
begin
  v_snap := public.vat_build_row_snapshot(p_configuration, p_calculated);
  return jsonb_build_object(
    'vat_code_id', (p_configuration->>'vat_code_id')::uuid,
    'vat_configuration_id', (p_configuration->>'configuration_id')::uuid,
    'vat_snapshot_version', 1,
    'vat_code', p_configuration->>'vat_code',
    'vat_description', p_configuration->>'description',
    'vat_rate', (p_configuration->>'rate')::numeric,
    'vat_nature', p_configuration->>'nature_code',
    'vat_operation_type', p_configuration->>'operation_type_code',
    'vat_direction', p_configuration->>'direction',
    'vat_deductibility_rate', (p_configuration->>'deductibility_rate')::numeric,
    'vat_account_id', nullif(p_configuration->>'vat_account_id', '')::uuid,
    'vat_register_id', nullif(p_configuration->>'vat_register_id', '')::uuid,
    'vat_valid_from', (p_configuration->>'valid_from')::date,
    'vat_valid_to', nullif(p_configuration->>'valid_to', '')::date,
    'vat_normative_reference', p_configuration->>'normative_reference',
    'vat_snapshot', v_snap,
    'imponibile', (p_calculated->>'taxable_amount')::numeric,
    'iva', (p_calculated->>'vat_amount')::numeric,
    'totale', (p_calculated->>'gross_amount')::numeric,
    'iva_percent', (p_configuration->>'rate')::numeric
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- List valid VAT codes for context
-- ---------------------------------------------------------------------------
create or replace function public.vat_list_codes_for_context(p_payload jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid := coalesce((p_payload->>'company_id')::uuid, public.rbac_user_company_id());
  v_operation_date date := coalesce((p_payload->>'operation_date')::date, current_date);
  v_direction text := lower(coalesce(nullif(trim(p_payload->>'direction'), ''), 'sales'));
  v_result jsonb := '[]'::jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.code), '[]'::jsonb)
  into v_result
  from (
    select distinct on (vc.id)
      vc.id as vat_code_id,
      vc.code,
      c.description,
      c.rate,
      n.code as nature_code,
      ot.code as operation_type_code,
      c.direction
    from public.vat_codes vc
    join public.vat_code_configurations c on c.vat_code_id = vc.id
    join public.vat_operation_types ot on ot.id = c.operation_type_id
    left join public.vat_natures n on n.id = c.nature_id
    where vc.company_id = v_company_id
      and vc.active = true
      and c.active = true
      and c.valid_from <= v_operation_date
      and (c.valid_to is null or v_operation_date <= c.valid_to)
      and (c.direction = v_direction or c.direction = 'both')
    order by vc.id, case when c.direction = v_direction then 0 else 1 end, c.valid_from desc
  ) x;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pre-consolidation validation for invoice
-- ---------------------------------------------------------------------------
create or replace function public.vat_validate_document(p_invoice_id uuid, p_context jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_row record;
  v_cfg jsonb;
  v_calc jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_tolerance numeric := 0.01;
  v_direction text;
  v_sum_imponibile numeric := 0;
  v_sum_iva numeric := 0;
  v_sum_totale numeric := 0;
begin
  select * into v_inv from public.invoices where id = p_invoice_id;
  if not found then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('code', 'VAT_CONFIGURATION_INVALID', 'message', 'Invoice not found')));
  end if;

  v_direction := case
    when v_inv.document_type = 'nota_credito' then 'sales'
    else coalesce(nullif(p_context->>'direction', ''), 'sales')
  end;

  for v_row in
    select * from public.invoice_rows where invoice_id = p_invoice_id order by created_at
  loop
    if v_row.vat_code_id is null then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'VAT_CODE_MISSING', 'row_id', v_row.id));
      continue;
    end if;

    begin
      v_cfg := public.vat_resolve_configuration(jsonb_build_object(
        'company_id', v_inv.company_id,
        'vat_code_id', v_row.vat_code_id,
        'operation_date', v_inv.data_emissione,
        'direction', v_direction
      ));
    exception
      when others then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', SQLERRM, 'row_id', v_row.id));
        continue;
    end;

    v_calc := public.vat_calculate_line(jsonb_build_object(
      'configuration', v_cfg,
      'quantita', v_row.quantita,
      'prezzo_unitario', v_row.prezzo_unitario,
      'sconto_percent', v_row.sconto_percent,
      'sign', case when v_inv.document_type = 'nota_credito' then -1 else 1 end
    ));

    if abs((v_calc->>'taxable_amount')::numeric - v_row.imponibile) > v_tolerance
       or abs((v_calc->>'vat_amount')::numeric - v_row.iva) > v_tolerance
       or abs((v_calc->>'gross_amount')::numeric - v_row.totale) > v_tolerance then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'VAT_AMOUNT_MISMATCH',
        'row_id', v_row.id,
        'expected', v_calc,
        'actual', jsonb_build_object('imponibile', v_row.imponibile, 'iva', v_row.iva, 'totale', v_row.totale)
      ));
    end if;

    v_sum_imponibile := v_sum_imponibile + (v_calc->>'taxable_amount')::numeric;
    v_sum_iva := v_sum_iva + (v_calc->>'vat_amount')::numeric;
    v_sum_totale := v_sum_totale + (v_calc->>'gross_amount')::numeric;
  end loop;

  if abs(v_sum_imponibile - v_inv.imponibile) > v_tolerance
     or abs(v_sum_iva - v_inv.iva) > v_tolerance
     or abs(v_sum_totale - v_inv.totale) > v_tolerance then
    v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'DOCUMENT_TOTAL_CONSISTENT', 'message', 'Header totals mismatch'));
  end if;

  return jsonb_build_object(
    'ok', jsonb_array_length(v_errors) = 0,
    'errors', v_errors
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- E-invoice pre-flight (SdI coherence)
-- ---------------------------------------------------------------------------
create or replace function public.vat_validate_invoice_for_einvoice(p_invoice_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
  v_errors jsonb := '[]'::jsonb;
begin
  for v_row in select * from public.invoice_rows where invoice_id = p_invoice_id loop
    if v_row.vat_snapshot is null then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'VAT_SNAPSHOT_MISSING', 'row_id', v_row.id));
      continue;
    end if;

    if v_row.vat_operation_type = 'IMPONIBILE' and v_row.vat_rate > 0 then
      if abs(round(v_row.imponibile * v_row.vat_rate / 100, 2) - v_row.iva) > 0.01 then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'VAT_AMOUNT_MISMATCH', 'row_id', v_row.id));
      end if;
    elsif v_row.vat_operation_type <> 'IMPONIBILE' then
      if v_row.vat_nature is null then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'VAT_NATURE_REQUIRED', 'row_id', v_row.id));
      end if;
    end if;
  end loop;

  return jsonb_build_object('ok', jsonb_array_length(v_errors) = 0, 'errors', v_errors);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: create VAT code + initial configuration
-- ---------------------------------------------------------------------------
create or replace function public.vat_admin_create_code(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_company_id uuid := public.rbac_user_company_id();
  v_code_id uuid;
  v_cfg_id uuid;
  v_op_id uuid;
  v_nat_id uuid;
begin
  if not public.accounting_rbac_can('admin') then
    raise exception 'Permesso negato';
  end if;

  perform set_config('accounting.write_ssot', 'true', true);

  insert into public.vat_codes (company_id, code, active)
  values (v_company_id, upper(trim(p_payload->>'code')), coalesce((p_payload->>'active')::boolean, true))
  on conflict (company_id, code) do update set active = excluded.active
  returning id into v_code_id;

  select id into v_op_id
  from public.vat_operation_types
  where company_id = v_company_id and code = upper(trim(p_payload->>'operation_type_code'));

  if v_op_id is null then
    raise exception 'Operation type not found';
  end if;

  if nullif(trim(p_payload->>'nature_code'), '') is not null then
    select id into v_nat_id
    from public.vat_natures
    where company_id = v_company_id and code = trim(p_payload->>'nature_code');
  end if;

  perform public.vat_validate_configuration_combo(
    upper(trim(p_payload->>'operation_type_code')),
    nullif(trim(p_payload->>'nature_code'), ''),
    (p_payload->>'rate')::numeric,
    lower(trim(p_payload->>'direction'))
  );

  insert into public.vat_code_configurations (
    company_id, vat_code_id, description, rate, nature_id, operation_type_id,
    vat_account_id, vat_register_id, direction, deductibility_rate,
    valid_from, valid_to, active, normative_reference, notes, created_by, updated_by
  )
  values (
    v_company_id,
    v_code_id,
    coalesce(nullif(trim(p_payload->>'description'), ''), upper(trim(p_payload->>'code'))),
    coalesce((p_payload->>'rate')::numeric, 0),
    v_nat_id,
    v_op_id,
    nullif(p_payload->>'vat_account_id', '')::uuid,
    nullif(p_payload->>'vat_register_id', '')::uuid,
    lower(coalesce(nullif(trim(p_payload->>'direction'), ''), 'sales')),
    coalesce((p_payload->>'deductibility_rate')::numeric, 0),
    coalesce((p_payload->>'valid_from')::date, current_date),
    nullif(p_payload->>'valid_to', '')::date,
    true,
    nullif(trim(p_payload->>'normative_reference'), ''),
    nullif(trim(p_payload->>'notes'), ''),
    v_uid,
    v_uid
  )
  returning id into v_cfg_id;

  insert into public.vat_audit_events (company_id, entity_type, entity_id, action, new_value, created_by, reason)
  values (
    v_company_id, 'vat_code', v_code_id, 'create',
    jsonb_build_object('code', p_payload->>'code', 'configuration_id', v_cfg_id),
    v_uid, nullif(trim(p_payload->>'reason'), '')
  );

  return jsonb_build_object('vat_code_id', v_code_id, 'configuration_id', v_cfg_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: new configuration version (close previous if requested)
-- ---------------------------------------------------------------------------
create or replace function public.vat_admin_create_configuration_version(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_company_id uuid := public.rbac_user_company_id();
  v_code_id uuid := (p_payload->>'vat_code_id')::uuid;
  v_prev_id uuid := nullif(p_payload->>'close_configuration_id', '')::uuid;
  v_cfg_id uuid;
  v_op_id uuid;
  v_nat_id uuid;
begin
  if not public.accounting_rbac_can('admin') then
    raise exception 'Permesso negato';
  end if;

  perform set_config('accounting.write_ssot', 'true', true);

  if v_prev_id is not null then
    update public.vat_code_configurations
    set valid_to = coalesce((p_payload->>'valid_from')::date, current_date) - 1,
        updated_by = v_uid,
        updated_at = now()
    where id = v_prev_id and company_id = v_company_id;
  end if;

  select id into v_op_id
  from public.vat_operation_types
  where company_id = v_company_id and code = upper(trim(p_payload->>'operation_type_code'));

  if nullif(trim(p_payload->>'nature_code'), '') is not null then
    select id into v_nat_id
    from public.vat_natures
    where company_id = v_company_id and code = trim(p_payload->>'nature_code');
  end if;

  perform public.vat_validate_configuration_combo(
    upper(trim(p_payload->>'operation_type_code')),
    nullif(trim(p_payload->>'nature_code'), ''),
    (p_payload->>'rate')::numeric,
    lower(trim(p_payload->>'direction'))
  );

  insert into public.vat_code_configurations (
    company_id, vat_code_id, description, rate, nature_id, operation_type_id,
    vat_account_id, vat_register_id, direction, deductibility_rate,
    valid_from, valid_to, active, normative_reference, notes, created_by, updated_by
  )
  values (
    v_company_id,
    v_code_id,
    trim(p_payload->>'description'),
    (p_payload->>'rate')::numeric,
    v_nat_id,
    v_op_id,
    nullif(p_payload->>'vat_account_id', '')::uuid,
    nullif(p_payload->>'vat_register_id', '')::uuid,
    lower(trim(p_payload->>'direction')),
    coalesce((p_payload->>'deductibility_rate')::numeric, 0),
    coalesce((p_payload->>'valid_from')::date, current_date),
    nullif(p_payload->>'valid_to', '')::date,
    true,
    nullif(trim(p_payload->>'normative_reference'), ''),
    nullif(trim(p_payload->>'notes'), ''),
    v_uid,
    v_uid
  )
  returning id into v_cfg_id;

  insert into public.vat_audit_events (company_id, entity_type, entity_id, action, new_value, created_by, reason)
  values (
    v_company_id, 'vat_code_configuration', v_cfg_id, 'version_create',
    p_payload, v_uid, nullif(trim(p_payload->>'reason'), '')
  );

  return jsonb_build_object('configuration_id', v_cfg_id);
end;
$$;

-- Grants
revoke all on function public.vat_validate_configuration_combo(text, text, numeric, text) from public;
grant execute on function public.vat_resolve_configuration(jsonb) to authenticated, service_role;
grant execute on function public.vat_calculate_line(jsonb) to authenticated, service_role;
grant execute on function public.vat_build_row_snapshot(jsonb, jsonb) to authenticated, service_role;
grant execute on function public.vat_apply_row_snapshot(jsonb, jsonb) to authenticated, service_role;
grant execute on function public.vat_list_codes_for_context(jsonb) to authenticated, service_role;
grant execute on function public.vat_validate_document(uuid, jsonb) to authenticated, service_role;
grant execute on function public.vat_validate_invoice_for_einvoice(uuid) to authenticated, service_role;
grant execute on function public.vat_admin_create_code(jsonb) to authenticated, service_role;
grant execute on function public.vat_admin_create_configuration_version(jsonb) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
