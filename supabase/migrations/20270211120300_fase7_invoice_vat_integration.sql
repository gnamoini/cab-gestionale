-- FASE 7 — Invoice VAT integration (draft rows via VAT engine, snapshot on emit, NC rows).
begin;

-- Process draft invoice row through VAT engine (no snapshot until consolidation)
create or replace function public.vat_process_draft_row(
  p_company_id uuid,
  p_operation_date date,
  p_direction text,
  p_row jsonb,
  p_sign integer default 1
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_code_id uuid := nullif(p_row->>'vat_code_id', '')::uuid;
  v_cfg jsonb;
  v_calc jsonb;
begin
  if v_code_id is null and nullif(trim(p_row->>'vat_code'), '') is not null then
    select id into v_code_id
    from public.vat_codes
    where company_id = p_company_id and code = trim(p_row->>'vat_code') and active = true;
  end if;

  if v_code_id is null then
    raise exception 'VAT_CODE_MISSING';
  end if;

  v_cfg := public.vat_resolve_configuration(jsonb_build_object(
    'company_id', p_company_id,
    'vat_code_id', v_code_id,
    'operation_date', p_operation_date,
    'direction', p_direction
  ));

  v_calc := public.vat_calculate_line(jsonb_build_object(
    'configuration', v_cfg,
    'quantita', p_row->>'quantita',
    'prezzo_unitario', p_row->>'prezzo_unitario',
    'sconto_percent', p_row->>'sconto_percent',
    'sign', p_sign
  ));

  return jsonb_build_object(
    'vat_code_id', v_code_id,
    'imponibile', v_calc->>'taxable_amount',
    'iva', v_calc->>'vat_amount',
    'totale', v_calc->>'gross_amount',
    'iva_percent', v_cfg->>'rate',
    'configuration', v_cfg,
    'calculated', v_calc
  );
end;
$$;

-- Apply VAT snapshots to all rows on invoice consolidation
create or replace function public.vat_consolidate_invoice_rows(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_row record;
  v_cfg jsonb;
  v_calc jsonb;
  v_snap jsonb;
  v_direction text;
  v_sign integer;
begin
  select * into v_inv from public.invoices where id = p_invoice_id;
  if not found then
    raise exception 'Invoice not found';
  end if;

  v_direction := 'sales';
  v_sign := case when v_inv.document_type = 'nota_credito' then -1 else 1 end;

  for v_row in select * from public.invoice_rows where invoice_id = p_invoice_id loop
    if v_row.vat_code_id is null then
      raise exception 'VAT_CODE_MISSING on row %', v_row.id;
    end if;

    v_cfg := public.vat_resolve_configuration(jsonb_build_object(
      'company_id', v_inv.company_id,
      'vat_code_id', v_row.vat_code_id,
      'operation_date', v_inv.data_emissione,
      'direction', v_direction
    ));

    v_calc := public.vat_calculate_line(jsonb_build_object(
      'configuration', v_cfg,
      'quantita', v_row.quantita,
      'prezzo_unitario', v_row.prezzo_unitario,
      'sconto_percent', v_row.sconto_percent,
      'sign', v_sign
    ));

    v_snap := public.vat_apply_row_snapshot(v_cfg, v_calc);

    update public.invoice_rows set
      vat_code_id = (v_snap->>'vat_code_id')::uuid,
      vat_configuration_id = (v_snap->>'vat_configuration_id')::uuid,
      vat_snapshot_version = (v_snap->>'vat_snapshot_version')::integer,
      vat_code = v_snap->>'vat_code',
      vat_description = v_snap->>'vat_description',
      vat_rate = (v_snap->>'vat_rate')::numeric,
      vat_nature = v_snap->>'vat_nature',
      vat_operation_type = v_snap->>'vat_operation_type',
      vat_direction = v_snap->>'vat_direction',
      vat_deductibility_rate = (v_snap->>'vat_deductibility_rate')::numeric,
      vat_account_id = nullif(v_snap->>'vat_account_id', '')::uuid,
      vat_register_id = nullif(v_snap->>'vat_register_id', '')::uuid,
      vat_valid_from = (v_snap->>'vat_valid_from')::date,
      vat_valid_to = nullif(v_snap->>'vat_valid_to', '')::date,
      vat_normative_reference = v_snap->>'vat_normative_reference',
      vat_snapshot = v_snap->'vat_snapshot',
      imponibile = (v_snap->>'imponibile')::numeric,
      iva = (v_snap->>'iva')::numeric,
      totale = (v_snap->>'totale')::numeric,
      iva_percent = (v_snap->>'iva_percent')::numeric
    where id = v_row.id;
  end loop;

  update public.invoices i set
    imponibile = sub.imponibile,
    iva = sub.iva,
    totale = sub.totale
  from (
    select
      round(coalesce(sum(r.imponibile), 0), 2) as imponibile,
      round(coalesce(sum(r.iva), 0), 2) as iva,
      round(coalesce(sum(r.totale), 0), 2) as totale
    from public.invoice_rows r
    where r.invoice_id = p_invoice_id
  ) sub
  where i.id = p_invoice_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_invoice_with_rows_and_links — VAT engine for rows
-- ---------------------------------------------------------------------------
create or replace function public.create_invoice_with_rows_and_links(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_company uuid := coalesce(public.rbac_user_company_id(), '00000000-0000-4000-8000-000000000001'::uuid);
  v_invoice_id uuid;
  v_year integer;
  v_series text;
  v_status text;
  v_origine text;
  v_customer_id uuid;
  v_cliente_label text;
  v_customer_snapshot jsonb;
  v_data_emissione date;
  v_data_scadenza date;
  v_note text;
  v_admin_notes text;
  v_imponibile numeric := 0;
  v_iva numeric := 0;
  v_totale numeric := 0;
  v_row jsonb;
  v_processed jsonb;
  v_link jsonb;
  v_corr uuid := gen_random_uuid();
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  v_cliente_label := nullif(trim(p_payload->>'cliente_label'), '');
  if v_cliente_label is null then
    raise exception 'Cliente fattura obbligatorio';
  end if;

  v_status := coalesce(nullif(p_payload->>'status', ''), 'bozza');
  if v_status not in ('bozza', 'da_verificare') then
    raise exception 'Stato fattura iniziale non valido; usare invoice_apply_transition per emissione';
  end if;

  v_origine := nullif(p_payload->>'origine', '');
  if v_origine is not null and v_origine not in ('manuale', 'preventivo', 'multi_preventivo') then
    raise exception 'Origine fattura non valida';
  end if;

  v_data_emissione := coalesce(nullif(p_payload->>'data_emissione', '')::date, current_date);
  v_data_scadenza := nullif(p_payload->>'data_scadenza', '')::date;
  v_year := coalesce((p_payload->>'anno')::integer, extract(year from v_data_emissione)::integer);
  v_series := public.normalize_document_series(p_payload->>'series');
  v_customer_id := nullif(p_payload->>'customer_id', '')::uuid;
  v_customer_snapshot := coalesce(p_payload->'customer_snapshot', '{}'::jsonb);
  v_note := nullif(p_payload->>'note', '');
  v_admin_notes := nullif(p_payload->>'admin_notes', '');

  insert into public.invoices (
    company_id, numero, anno, series, status, origine, customer_id, cliente_label, customer_snapshot,
    data_emissione, data_scadenza, note, admin_notes, document_type, fiscal_context, created_by, updated_by
  )
  values (
    v_company, null, v_year, v_series, v_status, v_origine, v_customer_id, v_cliente_label, v_customer_snapshot,
    v_data_emissione, v_data_scadenza, v_note, v_admin_notes, 'fattura',
    coalesce(p_payload->'fiscal_context', '{}'::jsonb), v_uid, v_uid
  )
  returning id into v_invoice_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_payload->'rows', '[]'::jsonb))
  loop
    v_processed := public.vat_process_draft_row(v_company, v_data_emissione, 'sales', v_row, 1);

    insert into public.invoice_rows (
      invoice_id, tipo, descrizione, quantita, prezzo_unitario, sconto_percent, iva_percent,
      vat_code_id, imponibile, iva, totale, ricambio_id, lavorazione_id, preventivo_id, meta
    )
    values (
      v_invoice_id,
      coalesce(nullif(v_row->>'tipo', ''), 'libera'),
      coalesce(nullif(trim(v_row->>'descrizione'), ''), 'Riga fattura'),
      greatest(coalesce((v_row->>'quantita')::numeric, 1), 0.001),
      greatest(coalesce((v_row->>'prezzo_unitario')::numeric, 0), 0),
      least(greatest(coalesce((v_row->>'sconto_percent')::numeric, 0), 0), 100),
      (v_processed->>'iva_percent')::numeric,
      (v_processed->>'vat_code_id')::uuid,
      (v_processed->>'imponibile')::numeric,
      (v_processed->>'iva')::numeric,
      (v_processed->>'totale')::numeric,
      nullif(v_row->>'ricambio_id', '')::uuid,
      nullif(v_row->>'lavorazione_id', '')::uuid,
      nullif(v_row->>'preventivo_id', '')::uuid,
      coalesce(v_row->'meta', '{}'::jsonb)
    );

    v_imponibile := v_imponibile + (v_processed->>'imponibile')::numeric;
    v_iva := v_iva + (v_processed->>'iva')::numeric;
    v_totale := v_totale + (v_processed->>'totale')::numeric;
  end loop;

  if v_totale <= 0 then
    raise exception 'La fattura deve contenere almeno una riga con importo positivo';
  end if;

  for v_link in select * from jsonb_array_elements(coalesce(p_payload->'links', '[]'::jsonb))
  loop
    insert into public.invoice_links (
      invoice_id, source_type, source_id, allocated_imponibile, allocated_iva, allocated_totale, meta
    )
    values (
      v_invoice_id,
      coalesce(v_link->>'source_type', 'preventivo'),
      (v_link->>'source_id')::uuid,
      coalesce((v_link->>'allocated_imponibile')::numeric, 0),
      coalesce((v_link->>'allocated_iva')::numeric, 0),
      (v_link->>'allocated_totale')::numeric,
      coalesce(v_link->'meta', '{}'::jsonb)
    );
  end loop;

  perform public.assert_invoice_preventivo_allocations(v_invoice_id);

  update public.invoices
  set imponibile = round(v_imponibile, 2),
      iva = round(v_iva, 2),
      totale = round(v_totale, 2),
      residuo = round(v_totale, 2),
      updated_by = v_uid
  where id = v_invoice_id;

  perform public.invoice_insert_event(
    'invoice', v_invoice_id, 'invoice', v_invoice_id, v_invoice_id,
    'document', 'draft_created', v_corr, null,
    jsonb_build_object('status', v_status),
    v_uid
  );

  return v_invoice_id;
end;
$$;

-- invoice_apply_transition — emit validates + consolidates VAT snapshots (full FASE6 + FASE7 hook)
create or replace function public.invoice_apply_transition(
  p_invoice_id uuid,
  p_transition text,
  p_payload jsonb default '{}'::jsonb,
  p_actor_id uuid default null,
  p_expected_version integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_actor_id, public.rbac_auth_uid());
  v_inv record;
  v_corr uuid := gen_random_uuid();
  v_prev_event uuid;
  v_doc text;
  v_pay text;
  v_sdi text;
  v_open_id uuid;
  v_reason text;
  v_numero integer;
  v_validation jsonb;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Fattura non trovata';
  end if;

  if p_expected_version is not null and v_inv.version is distinct from p_expected_version then
    raise exception 'invoice_version_conflict';
  end if;

  v_doc := coalesce(v_inv.document_status, (select m.new_document_status from public.invoice_map_legacy_to_axes(v_inv.status) m));
  v_pay := coalesce(v_inv.payment_status, (select m.new_payment_status from public.invoice_map_legacy_to_axes(v_inv.status) m));
  v_sdi := coalesce(v_inv.sdi_status, (select m.new_sdi_status from public.invoice_map_legacy_to_axes(v_inv.status) m));

  case p_transition
    when 'submit_for_review' then
      if v_doc not in ('bozza') then raise exception 'Transizione non consentita'; end if;
      v_doc := 'da_verificare';
    when 'approve' then
      if v_doc not in ('da_verificare', 'bozza') then raise exception 'Transizione non consentita'; end if;
      v_doc := 'approvata';
      update public.invoices set approved_at = now(), approved_by = v_uid where id = p_invoice_id;
    when 'emit' then
      if v_doc in ('annullata', 'emessa') and v_inv.status not in ('bozza', 'da_verificare') then
        raise exception 'Transizione non consentita';
      end if;
      v_validation := public.vat_validate_document(p_invoice_id, '{}'::jsonb);
      if not coalesce((v_validation->>'ok')::boolean, false) then
        raise exception 'VAT validation failed: %', v_validation->'errors';
      end if;
      perform public.vat_consolidate_invoice_rows(p_invoice_id);
      select * into v_inv from public.invoices where id = p_invoice_id;
      if v_inv.numero is null then
        v_numero := public.allocate_document_number(
          coalesce(v_inv.document_type, 'fattura'),
          v_inv.anno,
          v_inv.series,
          v_inv.company_id
        );
        update public.invoices
        set numero = v_numero, updated_by = v_uid
        where id = p_invoice_id;
        v_inv.numero := v_numero;
      end if;
      v_doc := 'emessa';
      v_pay := coalesce(nullif(v_pay, ''), 'non_pagata');
      v_sdi := case when v_sdi = 'non_applicabile' then 'da_generare' else v_sdi end;
      if v_inv.totale > 0 and not exists (select 1 from public.customer_open_items where invoice_id = p_invoice_id) then
        insert into public.customer_open_items (
          customer_id, source_type, source_id, invoice_id, document_number,
          amount_signed, remaining_signed, due_date, status, opened_at
        )
        values (
          v_inv.customer_id, 'invoice', p_invoice_id, p_invoice_id,
          public.format_document_number(
            coalesce(v_inv.document_type, 'fattura'),
            v_inv.anno,
            v_inv.series,
            v_inv.numero
          ),
          -v_inv.totale, -v_inv.residuo, v_inv.data_scadenza,
          case when v_inv.residuo <= 0 then 'closed' when v_inv.pagato > 0 then 'partial' else 'open' end,
          coalesce(v_inv.data_emissione::timestamptz, now())
        )
        returning id into v_open_id;
      end if;
    when 'mark_sent_to_customer' then
      update public.invoices
      set sent_to_customer_at = coalesce(sent_to_customer_at, now()),
          updated_by = v_uid,
          version = version + 1
      where id = p_invoice_id;
      v_prev_event := public.invoice_insert_event(
        'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
        'document', 'customer_sent', v_corr, null,
        jsonb_build_object('transition', p_transition), v_uid
      );
      return;
    when 'cancel' then
      if v_doc = 'annullata' then raise exception 'Fattura già annullata'; end if;
      v_doc := 'annullata';
      v_reason := nullif(p_payload->>'reason', '');
      update public.invoices
      set annullata_at = now(),
          admin_notes = trim(coalesce(admin_notes || E'\n', '') || coalesce(v_reason, '')),
          updated_by = v_uid
      where id = p_invoice_id;
      update public.customer_open_items
      set remaining_signed = 0, status = 'closed', closed_at = now(), updated_at = now()
      where invoice_id = p_invoice_id and status <> 'closed';
    when 'mark_overdue' then
      if v_doc <> 'emessa' then raise exception 'Transizione non consentita'; end if;
      v_pay := 'scaduta';
    else
      raise exception 'Transizione sconosciuta: %', p_transition;
  end case;

  v_prev_event := public.invoice_write_status_axes(
    p_invoice_id, v_doc, v_pay, v_sdi, v_corr, null, true, v_uid, p_transition
  );
end;
$$;

-- create_credit_note_from_invoice — row-based VAT (multi-aliquota safe)
create or replace function public.create_credit_note_from_invoice(
  p_invoice_id uuid,
  p_amount numeric default null,
  p_reason text default null,
  p_rows jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_src record;
  v_nc_id uuid;
  v_numero integer;
  v_corr uuid := gen_random_uuid();
  v_src_row record;
  v_nc_row jsonb;
  v_processed jsonb;
  v_imponibile numeric := 0;
  v_iva numeric := 0;
  v_totale numeric := 0;
  v_use_rows jsonb;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into v_src from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Fattura non trovata'; end if;
  if v_src.status in ('bozza', 'da_verificare', 'annullata') then
    raise exception 'Stato fattura non valido per nota di credito';
  end if;
  if v_src.numero is null then
    raise exception 'Fattura sorgente senza numerazione; emettere prima la fattura';
  end if;

  if p_rows is not null and jsonb_array_length(p_rows) > 0 then
    v_use_rows := p_rows;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'parent_invoice_row_id', r.id,
      'tipo', r.tipo,
      'descrizione', r.descrizione,
      'quantita', r.quantita,
      'prezzo_unitario', r.prezzo_unitario,
      'sconto_percent', r.sconto_percent,
      'vat_code_id', r.vat_code_id
    )), '[]'::jsonb)
    into v_use_rows
    from public.invoice_rows r
    where r.invoice_id = p_invoice_id;
  end if;

  if jsonb_array_length(v_use_rows) = 0 then
    raise exception 'Nessuna riga disponibile per nota di credito';
  end if;

  v_numero := public.allocate_document_number(
    'nota_credito', v_src.anno, v_src.series, v_src.company_id
  );

  insert into public.invoices (
    company_id, numero, anno, series, status, document_type, document_status, payment_status, sdi_status,
    customer_id, cliente_label, customer_snapshot, data_emissione, parent_invoice_id,
    note, created_by, updated_by
  )
  values (
    v_src.company_id, v_numero, v_src.anno, v_src.series, 'emessa', 'nota_credito', 'emessa', 'non_pagata', 'da_generare',
    v_src.customer_id, v_src.cliente_label, v_src.customer_snapshot, current_date, p_invoice_id,
    coalesce(p_reason, 'Nota di credito'), v_uid, v_uid
  )
  returning id into v_nc_id;

  for v_nc_row in select * from jsonb_array_elements(v_use_rows)
  loop
    if v_nc_row->>'parent_invoice_row_id' is not null then
      select * into v_src_row from public.invoice_rows where id = (v_nc_row->>'parent_invoice_row_id')::uuid;
      if found and v_nc_row->>'vat_code_id' is null then
        v_nc_row := v_nc_row || jsonb_build_object('vat_code_id', v_src_row.vat_code_id);
      end if;
    end if;

    v_processed := public.vat_process_draft_row(
      v_src.company_id,
      current_date,
      'sales',
      v_nc_row,
      -1
    );

    insert into public.invoice_rows (
      invoice_id, tipo, descrizione, quantita, prezzo_unitario, sconto_percent, iva_percent,
      vat_code_id, parent_invoice_row_id, imponibile, iva, totale, meta
    )
    values (
      v_nc_id,
      coalesce(nullif(v_nc_row->>'tipo', ''), 'libera'),
      coalesce(nullif(trim(v_nc_row->>'descrizione'), ''), 'Riga nota di credito'),
      greatest(coalesce((v_nc_row->>'quantita')::numeric, 1), 0.001),
      greatest(coalesce((v_nc_row->>'prezzo_unitario')::numeric, 0), 0),
      least(greatest(coalesce((v_nc_row->>'sconto_percent')::numeric, 0), 0), 100),
      (v_processed->>'iva_percent')::numeric,
      (v_processed->>'vat_code_id')::uuid,
      nullif(v_nc_row->>'parent_invoice_row_id', '')::uuid,
      (v_processed->>'imponibile')::numeric,
      (v_processed->>'iva')::numeric,
      (v_processed->>'totale')::numeric,
      coalesce(v_nc_row->'meta', '{}'::jsonb)
    );

    v_imponibile := v_imponibile + (v_processed->>'imponibile')::numeric;
    v_iva := v_iva + (v_processed->>'iva')::numeric;
    v_totale := v_totale + (v_processed->>'totale')::numeric;
  end loop;

  perform public.vat_consolidate_invoice_rows(v_nc_id);

  update public.invoices
  set imponibile = round(v_imponibile, 2),
      iva = round(v_iva, 2),
      totale = round(abs(v_totale), 2),
      residuo = round(abs(v_totale), 2)
  where id = v_nc_id;

  insert into public.invoice_relations (source_invoice_id, target_invoice_id, relation_type, meta)
  values (p_invoice_id, v_nc_id, 'credit_note', jsonb_build_object('totale', abs(v_totale)));

  insert into public.customer_open_items (
    customer_id, source_type, source_id, invoice_id, document_number,
    amount_signed, remaining_signed, status
  )
  values (
    v_src.customer_id, 'credit_note', v_nc_id, v_nc_id,
    public.format_document_number('nota_credito', v_src.anno, v_src.series, v_numero),
    abs(v_totale), abs(v_totale), 'open'
  );

  perform public.invoice_insert_event(
    'invoice', v_nc_id, 'invoice', v_nc_id, v_nc_id,
    'document', 'credit_note_created', v_corr, null,
    jsonb_build_object('source_invoice_id', p_invoice_id, 'totale', abs(v_totale)),
    v_uid
  );

  return v_nc_id;
end;
$$;

-- update_invoice_draft_with_rows — VAT engine for rows
create or replace function public.update_invoice_draft_with_rows(p_invoice_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_company uuid;
  v_status text;
  v_origine text;
  v_customer_id uuid;
  v_cliente_label text;
  v_customer_snapshot jsonb;
  v_data_emissione date;
  v_data_scadenza date;
  v_note text;
  v_admin_notes text;
  v_new_status text;
  v_imponibile numeric := 0;
  v_iva numeric := 0;
  v_totale numeric := 0;
  v_row jsonb;
  v_processed jsonb;
  v_link jsonb;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  select status, company_id into v_status, v_company
  from public.invoices
  where id = p_invoice_id
  for update;

  if v_status is null then
    raise exception 'Fattura non trovata';
  end if;
  if v_status not in ('bozza', 'da_verificare') then
    raise exception 'Solo le bozze possono essere modificate';
  end if;

  v_cliente_label := nullif(trim(p_payload->>'cliente_label'), '');
  if v_cliente_label is null then
    raise exception 'Cliente fattura obbligatorio';
  end if;

  v_new_status := coalesce(nullif(p_payload->>'status', ''), v_status);
  if v_new_status not in ('bozza', 'da_verificare', 'emessa', 'inviata') then
    raise exception 'Stato fattura non valido';
  end if;

  v_origine := nullif(p_payload->>'origine', '');
  if v_origine is not null and v_origine not in ('manuale', 'preventivo', 'multi_preventivo') then
    raise exception 'Origine fattura non valida';
  end if;

  v_data_emissione := coalesce(nullif(p_payload->>'data_emissione', '')::date, current_date);
  v_data_scadenza := nullif(p_payload->>'data_scadenza', '')::date;
  v_customer_id := nullif(p_payload->>'customer_id', '')::uuid;
  v_customer_snapshot := coalesce(p_payload->'customer_snapshot', '{}'::jsonb);
  v_note := nullif(p_payload->>'note', '');
  v_admin_notes := nullif(p_payload->>'admin_notes', '');

  delete from public.invoice_links where invoice_id = p_invoice_id;
  delete from public.invoice_rows where invoice_id = p_invoice_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_payload->'rows', '[]'::jsonb))
  loop
    v_processed := public.vat_process_draft_row(v_company, v_data_emissione, 'sales', v_row, 1);

    insert into public.invoice_rows (
      invoice_id, tipo, descrizione, quantita, prezzo_unitario, sconto_percent, iva_percent,
      vat_code_id, imponibile, iva, totale, ricambio_id, lavorazione_id, preventivo_id, meta
    )
    values (
      p_invoice_id,
      coalesce(nullif(v_row->>'tipo', ''), 'libera'),
      coalesce(nullif(trim(v_row->>'descrizione'), ''), 'Riga fattura'),
      greatest(coalesce((v_row->>'quantita')::numeric, 1), 0.001),
      greatest(coalesce((v_row->>'prezzo_unitario')::numeric, 0), 0),
      least(greatest(coalesce((v_row->>'sconto_percent')::numeric, 0), 0), 100),
      (v_processed->>'iva_percent')::numeric,
      (v_processed->>'vat_code_id')::uuid,
      (v_processed->>'imponibile')::numeric,
      (v_processed->>'iva')::numeric,
      (v_processed->>'totale')::numeric,
      nullif(v_row->>'ricambio_id', '')::uuid,
      nullif(v_row->>'lavorazione_id', '')::uuid,
      nullif(v_row->>'preventivo_id', '')::uuid,
      coalesce(v_row->'meta', '{}'::jsonb)
    );

    v_imponibile := v_imponibile + (v_processed->>'imponibile')::numeric;
    v_iva := v_iva + (v_processed->>'iva')::numeric;
    v_totale := v_totale + (v_processed->>'totale')::numeric;
  end loop;

  for v_link in select * from jsonb_array_elements(coalesce(p_payload->'links', '[]'::jsonb))
  loop
    insert into public.invoice_links (
      invoice_id, source_type, source_id, allocated_imponibile, allocated_iva, allocated_totale, meta
    )
    values (
      p_invoice_id,
      coalesce(nullif(v_link->>'source_type', ''), 'preventivo'),
      (v_link->>'source_id')::uuid,
      greatest(coalesce((v_link->>'allocated_imponibile')::numeric, 0), 0),
      greatest(coalesce((v_link->>'allocated_iva')::numeric, 0), 0),
      greatest(coalesce((v_link->>'allocated_totale')::numeric, 0), 0),
      coalesce(v_link->'meta', '{}'::jsonb)
    );
  end loop;

  perform public.assert_invoice_preventivo_allocations(p_invoice_id);

  update public.invoices
  set origine = coalesce(v_origine, origine),
      status = v_new_status,
      customer_id = v_customer_id,
      cliente_label = v_cliente_label,
      customer_snapshot = v_customer_snapshot,
      data_emissione = v_data_emissione,
      data_scadenza = v_data_scadenza,
      note = v_note,
      admin_notes = v_admin_notes,
      fiscal_context = coalesce(p_payload->'fiscal_context', fiscal_context),
      imponibile = round(v_imponibile, 2),
      iva = round(v_iva, 2),
      totale = round(v_totale, 2),
      residuo = round(v_totale - pagato, 2),
      updated_by = v_uid
  where id = p_invoice_id;

  return p_invoice_id;
end;
$$;

commit;

notify pgrst, 'reload schema';
