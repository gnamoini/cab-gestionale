-- Origine su create + RPC atomica update bozza con replace righe/links.

create or replace function public.create_invoice_with_rows_and_links(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_invoice_id uuid;
  v_year integer;
  v_numero integer;
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
  v_row_imponibile numeric;
  v_row_iva numeric;
  v_row_totale numeric;
  v_link jsonb;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  v_cliente_label := nullif(trim(p_payload->>'cliente_label'), '');
  if v_cliente_label is null then
    raise exception 'Cliente fattura obbligatorio';
  end if;

  v_status := coalesce(nullif(p_payload->>'status', ''), 'bozza');
  if v_status not in ('bozza', 'da_verificare', 'emessa', 'inviata') then
    raise exception 'Stato fattura iniziale non valido';
  end if;

  v_origine := nullif(p_payload->>'origine', '');
  if v_origine is not null and v_origine not in ('manuale', 'preventivo', 'multi_preventivo') then
    raise exception 'Origine fattura non valida';
  end if;

  v_data_emissione := coalesce(nullif(p_payload->>'data_emissione', '')::date, current_date);
  v_data_scadenza := nullif(p_payload->>'data_scadenza', '')::date;
  v_year := coalesce((p_payload->>'anno')::integer, extract(year from v_data_emissione)::integer);
  v_customer_id := nullif(p_payload->>'customer_id', '')::uuid;
  v_customer_snapshot := coalesce(p_payload->'customer_snapshot', '{}'::jsonb);
  v_note := nullif(p_payload->>'note', '');
  v_admin_notes := nullif(p_payload->>'admin_notes', '');

  perform pg_advisory_xact_lock(hashtext('invoices:' || v_year::text));

  select coalesce(max(numero), 0) + 1 into v_numero
  from public.invoices
  where anno = v_year;

  insert into public.invoices (
    numero, anno, status, origine, customer_id, cliente_label, customer_snapshot,
    data_emissione, data_scadenza, note, admin_notes, created_by, updated_by
  )
  values (
    v_numero, v_year, v_status, v_origine, v_customer_id, v_cliente_label, v_customer_snapshot,
    v_data_emissione, v_data_scadenza, v_note, v_admin_notes, v_uid, v_uid
  )
  returning id into v_invoice_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_payload->'rows', '[]'::jsonb))
  loop
    v_row_imponibile := round(
      greatest(coalesce((v_row->>'quantita')::numeric, 1), 0)
      * greatest(coalesce((v_row->>'prezzo_unitario')::numeric, 0), 0)
      * (1 - least(greatest(coalesce((v_row->>'sconto_percent')::numeric, 0), 0), 100) / 100),
      2
    );
    v_row_iva := round(v_row_imponibile * greatest(coalesce((v_row->>'iva_percent')::numeric, 22), 0) / 100, 2);
    v_row_totale := round(v_row_imponibile + v_row_iva, 2);

    insert into public.invoice_rows (
      invoice_id, tipo, descrizione, quantita, prezzo_unitario, sconto_percent, iva_percent,
      imponibile, iva, totale, ricambio_id, lavorazione_id, preventivo_id, meta
    )
    values (
      v_invoice_id,
      coalesce(nullif(v_row->>'tipo', ''), 'libera'),
      coalesce(nullif(trim(v_row->>'descrizione'), ''), 'Riga fattura'),
      greatest(coalesce((v_row->>'quantita')::numeric, 1), 0.001),
      greatest(coalesce((v_row->>'prezzo_unitario')::numeric, 0), 0),
      least(greatest(coalesce((v_row->>'sconto_percent')::numeric, 0), 0), 100),
      greatest(coalesce((v_row->>'iva_percent')::numeric, 22), 0),
      v_row_imponibile,
      v_row_iva,
      v_row_totale,
      nullif(v_row->>'ricambio_id', '')::uuid,
      nullif(v_row->>'lavorazione_id', '')::uuid,
      nullif(v_row->>'preventivo_id', '')::uuid,
      coalesce(v_row->'meta', '{}'::jsonb)
    );

    v_imponibile := v_imponibile + v_row_imponibile;
    v_iva := v_iva + v_row_iva;
    v_totale := v_totale + v_row_totale;
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
      coalesce(nullif(v_link->>'source_type', ''), 'preventivo'),
      (v_link->>'source_id')::uuid,
      greatest(coalesce((v_link->>'allocated_imponibile')::numeric, 0), 0),
      greatest(coalesce((v_link->>'allocated_iva')::numeric, 0), 0),
      greatest(coalesce((v_link->>'allocated_totale')::numeric, 0), 0),
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

  return v_invoice_id;
end;
$$;

create or replace function public.update_invoice_draft_with_rows(p_invoice_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
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
  v_row_imponibile numeric;
  v_row_iva numeric;
  v_row_totale numeric;
  v_link jsonb;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  select status into v_status
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
    v_row_imponibile := round(
      greatest(coalesce((v_row->>'quantita')::numeric, 1), 0)
      * greatest(coalesce((v_row->>'prezzo_unitario')::numeric, 0), 0)
      * (1 - least(greatest(coalesce((v_row->>'sconto_percent')::numeric, 0), 0), 100) / 100),
      2
    );
    v_row_iva := round(v_row_imponibile * greatest(coalesce((v_row->>'iva_percent')::numeric, 22), 0) / 100, 2);
    v_row_totale := round(v_row_imponibile + v_row_iva, 2);

    insert into public.invoice_rows (
      invoice_id, tipo, descrizione, quantita, prezzo_unitario, sconto_percent, iva_percent,
      imponibile, iva, totale, ricambio_id, lavorazione_id, preventivo_id, meta
    )
    values (
      p_invoice_id,
      coalesce(nullif(v_row->>'tipo', ''), 'libera'),
      coalesce(nullif(trim(v_row->>'descrizione'), ''), 'Riga fattura'),
      greatest(coalesce((v_row->>'quantita')::numeric, 1), 0.001),
      greatest(coalesce((v_row->>'prezzo_unitario')::numeric, 0), 0),
      least(greatest(coalesce((v_row->>'sconto_percent')::numeric, 0), 0), 100),
      greatest(coalesce((v_row->>'iva_percent')::numeric, 22), 0),
      v_row_imponibile,
      v_row_iva,
      v_row_totale,
      nullif(v_row->>'ricambio_id', '')::uuid,
      nullif(v_row->>'lavorazione_id', '')::uuid,
      nullif(v_row->>'preventivo_id', '')::uuid,
      coalesce(v_row->'meta', '{}'::jsonb)
    );

    v_imponibile := v_imponibile + v_row_imponibile;
    v_iva := v_iva + v_row_iva;
    v_totale := v_totale + v_row_totale;
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
  set status = v_new_status,
      origine = coalesce(v_origine, origine),
      customer_id = v_customer_id,
      cliente_label = v_cliente_label,
      customer_snapshot = v_customer_snapshot,
      data_emissione = v_data_emissione,
      data_scadenza = v_data_scadenza,
      note = v_note,
      admin_notes = v_admin_notes,
      imponibile = round(v_imponibile, 2),
      iva = round(v_iva, 2),
      totale = round(v_totale, 2),
      residuo = round(v_totale, 2),
      updated_by = v_uid
  where id = p_invoice_id;

  return p_invoice_id;
end;
$$;

grant execute on function public.update_invoice_draft_with_rows(uuid, jsonb) to authenticated;
