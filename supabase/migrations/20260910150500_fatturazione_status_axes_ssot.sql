-- ERP Fatturazione — SSOT assi stato: invoice_write_status_axes + guard + eventi immutabili.
begin;

alter table public.invoices
  add column if not exists version integer not null default 1;

comment on column public.invoices.version is 'Optimistic lock; incrementato da transizioni dominio.';

-- ---------------------------------------------------------------------------
-- invoice_write_status_axes — unico punto UPDATE document_status/payment_status/sdi_status
-- ---------------------------------------------------------------------------
create or replace function public.invoice_write_status_axes(
  p_invoice_id uuid,
  p_document_status text,
  p_payment_status text,
  p_sdi_status text,
  p_correlation_id uuid default null,
  p_causation_id uuid default null,
  p_emit_event boolean default true,
  p_actor_id uuid default null,
  p_transition text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_actor_id, public.rbac_auth_uid());
  v_old record;
  v_corr uuid := coalesce(p_correlation_id, gen_random_uuid());
  v_event_id uuid;
begin
  select document_status, payment_status, sdi_status
  into v_old
  from public.invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Fattura non trovata';
  end if;

  if v_old.document_status is not distinct from p_document_status
     and v_old.payment_status is not distinct from p_payment_status
     and v_old.sdi_status is not distinct from p_sdi_status
  then
    return null;
  end if;

  perform set_config('invoice.axes_write_ssot', 'true', true);

  update public.invoices
  set document_status = p_document_status,
      payment_status = p_payment_status,
      sdi_status = p_sdi_status,
      updated_by = v_uid,
      version = version + 1
  where id = p_invoice_id;

  perform set_config('invoice.axes_write_ssot', 'false', true);

  if not p_emit_event then
    return null;
  end if;

  v_event_id := public.invoice_insert_event(
    'invoice', p_invoice_id, 'invoice', p_invoice_id, p_invoice_id,
    'document', 'status_changed', v_corr, p_causation_id,
    jsonb_build_object(
      'transition', coalesce(p_transition, 'axes_write'),
      'document_status', p_document_status,
      'payment_status', p_payment_status,
      'sdi_status', p_sdi_status
    ),
    v_uid
  );
  return v_event_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guard: assi modificabili solo via invoice_write_status_axes (session flag)
-- ---------------------------------------------------------------------------
create or replace function public.invoice_guard_direct_axes_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.document_status is distinct from old.document_status
      or new.payment_status is distinct from old.payment_status
      or new.sdi_status is distinct from old.sdi_status)
     and coalesce(current_setting('invoice.axes_write_ssot', true), '') <> 'true'
  then
    raise exception 'Aggiornamento diretto assi stato non consentito; usare invoice_write_status_axes';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoices_guard_axes on public.invoices;
create trigger trg_invoices_guard_axes
before update of document_status, payment_status, sdi_status
on public.invoices
for each row execute function public.invoice_guard_direct_axes_update();

-- ponytail: migration-only backfill bypasses guard via SECURITY DEFINER + set_config in apply_invoice_status_backfill

-- ---------------------------------------------------------------------------
-- invoice_events.created_at immutabile
-- ---------------------------------------------------------------------------
create or replace function public.invoice_events_guard_created_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.created_at is distinct from old.created_at then
    raise exception 'invoice_events.created_at non modificabile';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoice_events_guard_created_at on public.invoice_events;
create trigger trg_invoice_events_guard_created_at
before update of created_at on public.invoice_events
for each row execute function public.invoice_events_guard_created_at();

-- ---------------------------------------------------------------------------
-- Revoca INSERT diretto su invoice_events (solo invoice_insert_event)
-- ---------------------------------------------------------------------------
drop policy if exists cap_invoice_events_insert on public.invoice_events;

-- ---------------------------------------------------------------------------
-- append_billing_event — entry point TS per eventi non-RPC
-- ---------------------------------------------------------------------------
create or replace function public.append_billing_event(
  p_entity_type text,
  p_entity_id uuid,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_invoice_id uuid,
  p_event_category text,
  p_event_type text,
  p_correlation_id uuid default null,
  p_causation_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;
  return public.invoice_insert_event(
    p_entity_type, p_entity_id, p_aggregate_type, p_aggregate_id, p_invoice_id,
    p_event_category, p_event_type,
    coalesce(p_correlation_id, gen_random_uuid()),
    p_causation_id, p_payload, public.rbac_auth_uid()
  );
end;
$$;

grant execute on function public.append_billing_event(text, uuid, text, uuid, uuid, text, text, uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Refactor invoice_apply_transition → invoice_write_status_axes
-- ---------------------------------------------------------------------------
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
          v_inv.anno::text || '/' || v_inv.numero::text,
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

-- ---------------------------------------------------------------------------
-- Refactor register_invoice_payment → invoice_write_status_axes + causation chain
-- ---------------------------------------------------------------------------
create or replace function public.register_invoice_payment(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_invoice_id uuid;
  v_payment_id uuid;
  v_customer_payment_id uuid;
  v_importo numeric;
  v_paid numeric;
  v_total numeric;
  v_status text;
  v_doc text;
  v_pay text;
  v_sdi text;
  v_customer_id uuid;
  v_open_item_id uuid;
  v_corr uuid := gen_random_uuid();
  v_pay_event_id uuid;
  v_alloc_event_id uuid;
  v_status_event_id uuid;
begin
  if not public.rbac_module_can('fatturazione', 'write') then
    raise exception 'Permesso negato';
  end if;

  v_invoice_id := (p_payload->>'invoice_id')::uuid;
  v_importo := (p_payload->>'importo')::numeric;
  if v_importo <= 0 then
    raise exception 'Importo pagamento non valido';
  end if;

  select totale, status, document_status, payment_status, sdi_status, customer_id
  into v_total, v_status, v_doc, v_pay, v_sdi, v_customer_id
  from public.invoices
  where id = v_invoice_id
  for update;

  if v_status is null then
    raise exception 'Fattura non trovata';
  end if;
  if coalesce(v_doc, v_status) in ('bozza', 'da_verificare', 'annullata') then
    raise exception 'Pagamento non consentito per lo stato fattura corrente';
  end if;

  insert into public.invoice_payments (invoice_id, data, importo, metodo, riferimento, note, created_by)
  values (
    v_invoice_id,
    coalesce(nullif(p_payload->>'data', '')::date, current_date),
    v_importo,
    coalesce(nullif(p_payload->>'metodo', ''), 'bonifico'),
    nullif(p_payload->>'riferimento', ''),
    nullif(p_payload->>'note', ''),
    v_uid
  )
  returning id into v_payment_id;

  v_pay_event_id := public.invoice_insert_event(
    'invoice_payment', v_payment_id, 'invoice', v_invoice_id, v_invoice_id,
    'payment', 'payment_registered', v_corr, null,
    jsonb_build_object('importo', v_importo),
    v_uid
  );

  select coalesce(sum(importo), 0) into v_paid
  from public.invoice_payments
  where invoice_id = v_invoice_id;

  v_pay := case
    when round(v_total - v_paid, 2) <= 0 and v_total > 0 then 'pagata'
    when v_paid > 0 then 'parzialmente_pagata'
    else coalesce(v_pay, 'non_pagata')
  end;

  update public.invoices
  set pagato = least(round(v_paid, 2), v_total),
      residuo = greatest(round(v_total - v_paid, 2), 0),
      updated_by = v_uid,
      version = version + 1
  where id = v_invoice_id;

  v_status_event_id := public.invoice_write_status_axes(
    v_invoice_id,
    coalesce(v_doc, 'emessa'),
    v_pay,
    coalesce(v_sdi, 'da_generare'),
    v_corr,
    v_pay_event_id,
    true,
    v_uid,
    'register_payment'
  );

  select id into v_open_item_id from public.customer_open_items where invoice_id = v_invoice_id limit 1;
  if v_open_item_id is null and v_total > 0 then
    insert into public.customer_open_items (
      customer_id, source_type, source_id, invoice_id, document_number,
      amount_signed, remaining_signed, due_date, status, opened_at
    )
    select customer_id, 'invoice', v_invoice_id, v_invoice_id, anno::text || '/' || numero::text,
           -totale, -greatest(round(totale - v_paid, 2), 0), data_scadenza,
           case when round(totale - v_paid, 2) <= 0 then 'closed' when v_paid > 0 then 'partial' else 'open' end,
           coalesce(data_emissione::timestamptz, now())
    from public.invoices where id = v_invoice_id
    returning id into v_open_item_id;
  elsif v_open_item_id is not null then
    update public.customer_open_items
    set remaining_signed = -greatest(round(v_total - v_paid, 2), 0),
        status = case when round(v_total - v_paid, 2) <= 0 then 'closed' when v_paid > 0 then 'partial' else status end,
        closed_at = case when round(v_total - v_paid, 2) <= 0 then coalesce(closed_at, now()) else null end,
        updated_at = now()
    where id = v_open_item_id;
  end if;

  insert into public.customer_payments (
    customer_id, data, importo, metodo, riferimento, note, allocation_status, legacy_invoice_payment_id, created_by
  )
  select customer_id, coalesce(nullif(p_payload->>'data', '')::date, current_date), v_importo,
         coalesce(nullif(p_payload->>'metodo', ''), 'bonifico'),
         nullif(p_payload->>'riferimento', ''), nullif(p_payload->>'note', ''),
         'allocated', v_payment_id, v_uid
  from public.invoices where id = v_invoice_id
  returning id into v_customer_payment_id;

  if v_open_item_id is not null then
    insert into public.payment_allocations (payment_id, open_item_id, amount)
    values (v_customer_payment_id, v_open_item_id, v_importo)
    on conflict (payment_id, open_item_id) do update set amount = excluded.amount;

    v_alloc_event_id := public.invoice_insert_event(
      'payment_allocation', v_customer_payment_id, 'invoice', v_invoice_id, v_invoice_id,
      'payment', 'payment_allocated', v_corr, v_pay_event_id,
      jsonb_build_object('open_item_id', v_open_item_id, 'amount', v_importo, 'customer_payment_id', v_customer_payment_id),
      v_uid
    );
  end if;

  return v_payment_id;
end;
$$;

-- ponytail: apply_invoice_status_backfill uses set_config bypass for bulk migration
create or replace function public.apply_invoice_status_backfill()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
  v_doc text;
  v_pay text;
  v_sdi text;
  v_sent boolean;
begin
  if not public.rbac_module_can('fatturazione', 'admin') then
    raise exception 'Permesso negato';
  end if;

  perform set_config('invoice.axes_write_ssot', 'true', true);

  for r in select id, status, totale, residuo, pagato, data_scadenza, customer_id, numero, anno, cliente_label
           from public.invoices
  loop
    select m.new_document_status, m.new_payment_status, m.new_sdi_status, m.set_sent_to_customer
    into v_doc, v_pay, v_sdi, v_sent
    from public.invoice_map_legacy_to_axes(r.status) m;

    update public.invoices
    set document_status = v_doc,
        payment_status = v_pay,
        sdi_status = v_sdi,
        sent_to_customer_at = case when v_sent and sent_to_customer_at is null then now() else sent_to_customer_at end,
        document_type = coalesce(document_type, 'fattura'),
        accounting_status = coalesce(accounting_status, 'non_rilevante')
    where id = r.id;

    if v_doc = 'emessa' and r.totale > 0 then
      insert into public.customer_open_items (
        customer_id, source_type, source_id, invoice_id, document_number,
        amount_signed, remaining_signed, due_date, status, opened_at
      )
      select
        r.customer_id,
        case when coalesce(i.document_type, 'fattura') = 'nota_credito' then 'credit_note' else 'invoice' end,
        r.id, r.id, i.anno::text || '/' || i.numero::text,
        case when coalesce(i.document_type, 'fattura') = 'nota_credito' then r.totale else -r.totale end,
        case when coalesce(i.document_type, 'fattura') = 'nota_credito' then r.totale else -r.residuo end,
        r.data_scadenza,
        case when r.residuo <= 0 then 'closed' when r.pagato > 0 then 'partial' else 'open' end,
        coalesce(i.data_emissione::timestamptz, now())
      from public.invoices i
      where i.id = r.id
        and not exists (select 1 from public.customer_open_items coi where coi.invoice_id = r.id);
    end if;

    v_count := v_count + 1;
  end loop;

  perform set_config('invoice.axes_write_ssot', 'false', true);

  insert into public.customer_payments (
    customer_id, data, importo, metodo, riferimento, note, allocation_status, legacy_invoice_payment_id, created_by
  )
  select
    i.customer_id, ip.data, ip.importo, ip.metodo, ip.riferimento, ip.note,
    'allocated', ip.id, ip.created_by
  from public.invoice_payments ip
  join public.invoices i on i.id = ip.invoice_id
  where not exists (
    select 1 from public.customer_payments cp where cp.legacy_invoice_payment_id = ip.id
  );

  insert into public.payment_allocations (payment_id, open_item_id, amount)
  select cp.id, coi.id, least(cp.importo, abs(coi.remaining_signed))
  from public.customer_payments cp
  join public.invoice_payments ip on ip.id = cp.legacy_invoice_payment_id
  join public.customer_open_items coi on coi.invoice_id = ip.invoice_id
  where not exists (
    select 1 from public.payment_allocations pa where pa.payment_id = cp.id and pa.open_item_id = coi.id
  );

  return v_count;
end;
$$;

grant execute on function public.invoice_write_status_axes(uuid, text, text, text, uuid, uuid, boolean, uuid, text) to authenticated;
grant execute on function public.invoice_apply_transition(uuid, text, jsonb, uuid, integer) to authenticated;

commit;
