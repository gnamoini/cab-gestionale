-- FASE 7 — VAT Engine seed (idempotent per company).
begin;

-- Seed operation types and natures for every company; VAT codes require accounting accounts (optional).
create or replace function public.vat_seed_company_defaults(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op_imponibile uuid;
  v_op_esente uuid;
  v_op_non_imponibile uuid;
  v_op_non_soggetta uuid;
  v_op_rc uuid;
  v_nat_n4 uuid;
  v_reg_sales uuid;
  v_reg_purchase uuid;
  v_code_iva22 uuid;
  v_code_iva10 uuid;
  v_code_iva4 uuid;
  v_code_n4 uuid;
begin
  if p_company_id is null then
    raise exception 'company_id required';
  end if;

  insert into public.vat_operation_types (company_id, code, description) values
    (p_company_id, 'IMPONIBILE', 'Operazione imponibile'),
    (p_company_id, 'ESENTE', 'Operazione esente'),
    (p_company_id, 'NON_IMPONIBILE', 'Operazione non imponibile'),
    (p_company_id, 'NON_SOGGETTA', 'Operazione non soggetta'),
    (p_company_id, 'REVERSE_CHARGE', 'Inversione contabile (semantica interna)'),
    (p_company_id, 'ALTRO', 'Altra classificazione operativa')
  on conflict (company_id, code) do nothing;

  select id into v_op_imponibile from public.vat_operation_types where company_id = p_company_id and code = 'IMPONIBILE';
  select id into v_op_esente from public.vat_operation_types where company_id = p_company_id and code = 'ESENTE';
  select id into v_op_non_imponibile from public.vat_operation_types where company_id = p_company_id and code = 'NON_IMPONIBILE';
  select id into v_op_non_soggetta from public.vat_operation_types where company_id = p_company_id and code = 'NON_SOGGETTA';
  select id into v_op_rc from public.vat_operation_types where company_id = p_company_id and code = 'REVERSE_CHARGE';

  insert into public.vat_natures (company_id, family, code, description, valid_from) values
    (p_company_id, 'N4', 'N4', 'Operazioni esenti', '1900-01-01'),
    (p_company_id, 'N2', 'N2.1', 'Non soggette ad IVA ai sensi degli artt. da 7 a 7-septies del DPR 633/72', '1900-01-01'),
    (p_company_id, 'N2', 'N2.2', 'Non soggette — altri casi', '1900-01-01'),
    (p_company_id, 'N3', 'N3.1', 'Non imponibili — esportazioni', '1900-01-01'),
    (p_company_id, 'N3', 'N3.2', 'Non imponibili — cessioni intracomunitarie', '1900-01-01'),
    (p_company_id, 'N6', 'N6.1', 'Inversione contabile — cessione rottami', '1900-01-01'),
    (p_company_id, 'N6', 'N6.2', 'Inversione contabile — cessione oro/argento', '1900-01-01')
  on conflict (company_id, code) do nothing;

  select id into v_nat_n4 from public.vat_natures where company_id = p_company_id and code = 'N4';

  insert into public.vat_registries (company_id, code, description, registry_type, direction, valid_from)
  values
    (p_company_id, 'VENDITE', 'Registro IVA vendite', 'sales', 'sales', '1900-01-01'),
    (p_company_id, 'ACQUISTI', 'Registro IVA acquisti', 'purchase', 'purchase', '1900-01-01')
  on conflict (company_id, code) do nothing;

  select id into v_reg_sales from public.vat_registries where company_id = p_company_id and code = 'VENDITE';
  select id into v_reg_purchase from public.vat_registries where company_id = p_company_id and code = 'ACQUISTI';

  insert into public.vat_codes (company_id, code, active)
  values
    (p_company_id, 'IVA22', true),
    (p_company_id, 'IVA10', true),
    (p_company_id, 'IVA4', true),
    (p_company_id, 'N4', true)
  on conflict (company_id, code) do nothing;

  select id into v_code_iva22 from public.vat_codes where company_id = p_company_id and code = 'IVA22';
  select id into v_code_iva10 from public.vat_codes where company_id = p_company_id and code = 'IVA10';
  select id into v_code_iva4 from public.vat_codes where company_id = p_company_id and code = 'IVA4';
  select id into v_code_n4 from public.vat_codes where company_id = p_company_id and code = 'N4';

  -- Sales configurations
  if not exists (
    select 1 from public.vat_code_configurations
    where company_id = p_company_id and vat_code_id = v_code_iva22 and direction = 'sales'
  ) then
    insert into public.vat_code_configurations (
      company_id, vat_code_id, description, rate, nature_id, operation_type_id,
      vat_register_id, direction, deductibility_rate, valid_from,
      normative_reference
    ) values
      (p_company_id, v_code_iva22, 'IVA 22%', 22, null, v_op_imponibile, v_reg_sales, 'sales', 0, '1900-01-01', 'Aliquota ordinaria'),
      (p_company_id, v_code_iva10, 'IVA 10%', 10, null, v_op_imponibile, v_reg_sales, 'sales', 0, '1900-01-01', 'Aliquota ridotta'),
      (p_company_id, v_code_iva4, 'IVA 4%', 4, null, v_op_imponibile, v_reg_sales, 'sales', 0, '1900-01-01', 'Aliquota minima'),
      (p_company_id, v_code_n4, 'Operazione esente', 0, v_nat_n4, v_op_esente, v_reg_sales, 'sales', 0, '1900-01-01', 'Natura N4');
  end if;

  -- Purchase configurations (deductibility 100% for standard rates)
  if not exists (
    select 1 from public.vat_code_configurations
    where company_id = p_company_id and vat_code_id = v_code_iva22 and direction = 'purchase'
  ) then
    insert into public.vat_code_configurations (
      company_id, vat_code_id, description, rate, operation_type_id,
      vat_register_id, direction, deductibility_rate, valid_from,
      normative_reference
    ) values
      (p_company_id, v_code_iva22, 'IVA 22% acquisti', 22, v_op_imponibile, v_reg_purchase, 'purchase', 100, '1900-01-01', 'Aliquota ordinaria'),
      (p_company_id, v_code_iva10, 'IVA 10% acquisti', 10, v_op_imponibile, v_reg_purchase, 'purchase', 100, '1900-01-01', 'Aliquota ridotta'),
      (p_company_id, v_code_iva4, 'IVA 4% acquisti', 4, v_op_imponibile, v_reg_purchase, 'purchase', 100, '1900-01-01', 'Aliquota minima');
  end if;
end;
$$;

grant execute on function public.vat_seed_company_defaults(uuid) to service_role;

-- Seed all existing companies
do $$
declare
  v_company uuid;
begin
  for v_company in select id from public.companies loop
    perform public.vat_seed_company_defaults(v_company);
  end loop;
end;
$$;

commit;

notify pgrst, 'reload schema';
