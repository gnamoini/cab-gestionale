-- ERP Fatturazione Hub — Fase 1B: NC + pagamento multi-allocazione.
begin;

create or replace function public.create_credit_note_from_invoice(
  p_invoice_id uuid,
  p_amount numeric default null,
  p_reason text default null
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
  v_amount numeric;
  v_corr uuid := gen_random_uuid();
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into v_src from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Fattura non trovata'; end if;
  if v_src.status in ('bozza', 'da_verificare', 'annullata') then
    raise exception 'Stato fattura non valido per nota di credito';
  end if;

  v_amount := coalesce(p_amount, v_src.totale);
  if v_amount <= 0 or v_amount > v_src.totale then
    raise exception 'Importo nota di credito non valido';
  end if;

  perform pg_advisory_xact_lock(hashtext('invoices:' || v_src.anno::text));

  select coalesce(max(numero), 0) + 1 into v_numero from public.invoices where anno = v_src.anno;

  insert into public.invoices (
    numero, anno, status, document_type, document_status, payment_status, sdi_status,
    customer_id, cliente_label, customer_snapshot, data_emissione, data_scadenza,
    imponibile, iva, totale, pagato, residuo, note, parent_invoice_id, created_by, updated_by
  )
  values (
    v_numero, v_src.anno, 'emessa', 'nota_credito', 'emessa', 'non_pagata', 'da_generare',
    v_src.customer_id, v_src.cliente_label, v_src.customer_snapshot, current_date, null,
    round(v_amount / 1.22, 2), round(v_amount - round(v_amount / 1.22, 2), 2), v_amount, 0, v_amount,
    coalesce(p_reason, 'Nota di credito'), p_invoice_id, v_uid, v_uid
  )
  returning id into v_nc_id;

  insert into public.invoice_relations (source_invoice_id, target_invoice_id, relation_type, meta)
  values (p_invoice_id, v_nc_id, 'credit_note', jsonb_build_object('amount', v_amount));

  insert into public.customer_open_items (
    customer_id, source_type, source_id, invoice_id, document_number,
    amount_signed, remaining_signed, status
  )
  values (
    v_src.customer_id, 'credit_note', v_nc_id, v_nc_id, v_src.anno::text || '/' || v_numero::text,
    v_amount, v_amount, 'open'
  );

  perform public.invoice_insert_event(
    'invoice', v_nc_id, 'invoice', v_nc_id, v_nc_id,
    'document', 'credit_note_created', v_corr, null,
    jsonb_build_object('source_invoice_id', p_invoice_id, 'amount', v_amount),
    v_uid
  );

  return v_nc_id;
end;
$$;

create or replace function public.register_customer_payment_multi(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_payment_id uuid;
  v_customer_id uuid;
  v_importo numeric;
  v_alloc jsonb;
  v_open_id uuid;
  v_alloc_amount numeric;
  v_total_alloc numeric := 0;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  v_customer_id := (p_payload->>'customer_id')::uuid;
  v_importo := (p_payload->>'importo')::numeric;
  if v_importo <= 0 then raise exception 'Importo non valido'; end if;

  insert into public.customer_payments (customer_id, data, importo, metodo, riferimento, note, allocation_status, created_by)
  values (
    v_customer_id,
    coalesce(nullif(p_payload->>'data', '')::date, current_date),
    v_importo,
    coalesce(nullif(p_payload->>'metodo', ''), 'bonifico'),
    nullif(p_payload->>'riferimento', ''),
    nullif(p_payload->>'note', ''),
    'unallocated',
    v_uid
  )
  returning id into v_payment_id;

  for v_alloc in select * from jsonb_array_elements(coalesce(p_payload->'allocations', '[]'::jsonb))
  loop
    v_open_id := (v_alloc->>'open_item_id')::uuid;
    v_alloc_amount := (v_alloc->>'amount')::numeric;
    if v_alloc_amount <= 0 then continue; end if;
    insert into public.payment_allocations (payment_id, open_item_id, amount)
    values (v_payment_id, v_open_id, v_alloc_amount)
    on conflict (payment_id, open_item_id) do update set amount = excluded.amount;
    v_total_alloc := v_total_alloc + v_alloc_amount;
    update public.customer_open_items
    set remaining_signed = remaining_signed + v_alloc_amount,
        status = case when remaining_signed + v_alloc_amount >= 0 then 'closed' else 'partial' end,
        updated_at = now()
    where id = v_open_id;
  end loop;

  update public.customer_payments
  set allocation_status = case
    when v_total_alloc <= 0 then 'unallocated'
    when v_total_alloc < v_importo then 'partial'
    else 'allocated'
  end
  where id = v_payment_id;

  return v_payment_id;
end;
$$;

grant execute on function public.create_credit_note_from_invoice(uuid, numeric, text) to authenticated;
grant execute on function public.register_customer_payment_multi(jsonb) to authenticated;

commit;
