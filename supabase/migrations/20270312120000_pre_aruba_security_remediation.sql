-- PRE-ARUBA security remediation: fiscal axis SSOT, SDI RPC boundary, audit actor, tenant guard, snapshot RLS.

begin;

-- ---------------------------------------------------------------------------
-- P0-SEC-01: extend axis guard to fiscal_validity + accounting_status
-- ---------------------------------------------------------------------------
create or replace function public.invoice_guard_direct_axes_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    new.document_status is distinct from old.document_status
    or new.payment_status is distinct from old.payment_status
    or new.sdi_status is distinct from old.sdi_status
    or new.fiscal_validity is distinct from old.fiscal_validity
    or new.accounting_status is distinct from old.accounting_status
  )
  and coalesce(current_setting('invoice.axes_write_ssot', true), '') <> 'true'
  then
    raise exception 'Aggiornamento diretto assi stato non consentito; usare invoice_write_status_axes';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoices_guard_axes on public.invoices;
create trigger trg_invoices_guard_axes
before update of document_status, payment_status, sdi_status, fiscal_validity, accounting_status
on public.invoices
for each row execute function public.invoice_guard_direct_axes_update();

-- ---------------------------------------------------------------------------
-- P2: emitted invoice totals immutable (no client PATCH after emessa)
-- ---------------------------------------------------------------------------
create or replace function public.invoice_guard_emitted_totals_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(old.document_status, '') = 'emessa'
     and (
       new.imponibile is distinct from old.imponibile
       or new.iva is distinct from old.iva
       or new.totale is distinct from old.totale
     )
  then
    raise exception 'Totali fattura emessa non modificabili';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoices_guard_emitted_totals on public.invoices;
create trigger trg_invoices_guard_emitted_totals
before update of imponibile, iva, totale
on public.invoices
for each row execute function public.invoice_guard_emitted_totals_update();

-- ---------------------------------------------------------------------------
-- P1-IDOR: tenant guard helper (company_id on invoices)
-- ---------------------------------------------------------------------------
create or replace function public.invoice_assert_tenant_access(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_company uuid;
  v_inv_company uuid;
  v_service boolean;
begin
  v_service := coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_setting('role', true) = 'service_role';
  if v_service then
    return;
  end if;

  v_user_company := public.rbac_user_company_id();
  select company_id into v_inv_company from public.invoices where id = p_invoice_id;
  if not found then
    raise exception 'Fattura non trovata';
  end if;
  if v_user_company is not null and v_inv_company is distinct from v_user_company then
    raise exception 'Fattura non trovata';
  end if;
end;
$$;

revoke all on function public.invoice_assert_tenant_access(uuid) from public, anon, authenticated;
grant execute on function public.invoice_assert_tenant_access(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- P1-AUDIT: invoice_insert_event — actor from session, not client payload
-- ---------------------------------------------------------------------------
create or replace function public.invoice_insert_event(
  p_entity_type text,
  p_entity_id uuid,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_invoice_id uuid,
  p_event_category text,
  p_event_type text,
  p_correlation_id uuid,
  p_causation_id uuid,
  p_payload jsonb,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor uuid;
  v_service boolean;
begin
  v_service := coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_setting('role', true) = 'service_role';

  if not v_service then
    perform public.security_assert_authenticated();
    if not public.rbac_module_can('fatturazione', 'write') then
      raise exception 'Permesso negato' using errcode = '42501';
    end if;
    if p_invoice_id is not null then
      perform public.invoice_assert_tenant_access(p_invoice_id);
    end if;
    v_actor := public.rbac_auth_uid();
    if v_actor is null then
      raise exception 'Autenticazione richiesta' using errcode = '42501';
    end if;
  else
    v_actor := coalesce(p_actor_id, public.rbac_auth_uid());
  end if;

  insert into public.invoice_events (
    entity_type, entity_id, aggregate_type, aggregate_id, invoice_id,
    event_category, event_type, correlation_id, causation_id, payload, actor_id
  )
  values (
    p_entity_type, p_entity_id, p_aggregate_type, p_aggregate_id, p_invoice_id,
    p_event_category, p_event_type, p_correlation_id, p_causation_id, coalesce(p_payload, '{}'::jsonb), v_actor
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- P1-SDI: apply_sdi_event — service_role only (server boundary)
-- ---------------------------------------------------------------------------
create or replace function public.apply_sdi_event(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_transmission_id uuid;
  v_canonical text;
  v_raw_code text;
  v_idempotency text;
  v_payload_hash text;
  v_provider_event_id text;
  v_sdi_id text;
  v_inv record;
  v_from_axes jsonb;
  v_to_axes jsonb;
  v_sdi text;
  v_fv text;
  v_service boolean;
  v_existing uuid;
  v_company_id uuid;
begin
  v_service := coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_setting('role', true) = 'service_role';
  if not v_service then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  v_invoice_id := (p_payload->>'invoice_id')::uuid;
  v_transmission_id := nullif(p_payload->>'transmission_id', '')::uuid;
  v_canonical := upper(trim(p_payload->>'canonical_event_type'));
  v_raw_code := nullif(trim(p_payload->>'raw_sdi_event_code'), '');
  v_idempotency := trim(p_payload->>'idempotency_key');
  v_payload_hash := trim(p_payload->>'payload_hash');
  v_provider_event_id := nullif(trim(p_payload->>'provider_event_id'), '');
  v_sdi_id := nullif(trim(p_payload->>'sdi_identifier'), '');

  if v_invoice_id is null or v_canonical is null or v_idempotency = '' then
    raise exception 'invoice_id, canonical_event_type, idempotency_key obbligatori';
  end if;

  select id into v_existing from public.invoice_sdi_events where idempotency_key = v_idempotency;
  if found then
    return jsonb_build_object('ok', true, 'idempotent', true, 'event_id', v_existing);
  end if;

  select * into v_inv from public.invoices where id = v_invoice_id for update;
  if not found then raise exception 'Fattura non trovata'; end if;

  v_company_id := v_inv.company_id;
  v_from_axes := jsonb_build_object(
    'document_status', v_inv.document_status,
    'sdi_status', v_inv.sdi_status,
    'fiscal_validity', v_inv.fiscal_validity
  );

  if v_canonical = 'REJECTED' then
    perform public.handle_sdi_rejected(
      v_invoice_id,
      coalesce(p_payload->>'parsed_message', p_payload->>'reason')
    );
    insert into public.invoice_sdi_events (
      company_id, invoice_id, transmission_id, canonical_event_type, raw_sdi_event_code,
      provider_event_id, sdi_identifier, event_payload, payload_hash,
      parsed_code, parsed_message, idempotency_key
    )
    values (
      v_company_id, v_invoice_id, v_transmission_id, v_canonical, v_raw_code,
      v_provider_event_id, v_sdi_id, coalesce(p_payload->'event_payload', '{}'::jsonb),
      coalesce(v_payload_hash, v_idempotency),
      p_payload->>'parsed_code', p_payload->>'parsed_message', v_idempotency
    );
    select * into v_inv from public.invoices where id = v_invoice_id;
    v_to_axes := jsonb_build_object(
      'document_status', v_inv.document_status,
      'sdi_status', v_inv.sdi_status,
      'fiscal_validity', v_inv.fiscal_validity
    );
    perform public.invoice_record_state_history(
      v_invoice_id, 'sdi_rejected', v_from_axes, v_to_axes, 'transmission', v_transmission_id, p_payload
    );
    if v_transmission_id is not null then
      update public.invoice_transmissions
      set transport_status = 'synced', last_event_at = now(), sdi_identifier = coalesce(v_sdi_id, sdi_identifier)
      where id = v_transmission_id;
    end if;
    return jsonb_build_object('ok', true, 'canonical', v_canonical, 'fiscal_validity', v_inv.fiscal_validity);
  end if;

  v_sdi := case v_canonical
    when 'DELIVERY' then 'consegnata'
    when 'DELIVERY_UNAVAILABLE' then 'impossibilita_consegna'
    when 'SUBMITTED' then 'inviata'
    else v_inv.sdi_status
  end;

  v_fv := case
    when v_canonical in ('DELIVERY', 'DELIVERY_UNAVAILABLE') then 'validly_issued'
    else coalesce(v_inv.fiscal_validity, 'pending')
  end;

  if v_sdi is not distinct from v_inv.sdi_status
     and v_fv is not distinct from v_inv.fiscal_validity then
    insert into public.invoice_sdi_events (
      company_id, invoice_id, transmission_id, canonical_event_type, raw_sdi_event_code,
      provider_event_id, sdi_identifier, event_payload, payload_hash,
      parsed_code, parsed_message, idempotency_key
    )
    values (
      v_company_id, v_invoice_id, v_transmission_id, v_canonical, v_raw_code,
      v_provider_event_id, v_sdi_id, coalesce(p_payload->'event_payload', '{}'::jsonb),
      coalesce(v_payload_hash, v_idempotency),
      p_payload->>'parsed_code', p_payload->>'parsed_message', v_idempotency
    )
    on conflict (idempotency_key) do nothing;
    return jsonb_build_object('ok', true, 'idempotent', true);
  end if;

  perform public.invoice_write_status_axes(
    p_invoice_id,
    coalesce(v_inv.document_status, 'emessa'),
    coalesce(v_inv.payment_status, 'non_pagata'),
    v_sdi,
    gen_random_uuid(),
    null,
    true,
    null,
    'sdi_' || lower(v_canonical),
    v_fv,
    v_inv.accounting_status
  );

  insert into public.invoice_sdi_events (
    company_id, invoice_id, transmission_id, canonical_event_type, raw_sdi_event_code,
    provider_event_id, sdi_identifier, event_payload, payload_hash,
    parsed_code, parsed_message, idempotency_key
  )
  values (
    v_company_id, v_invoice_id, v_transmission_id, v_canonical, v_raw_code,
    v_provider_event_id, v_sdi_id, coalesce(p_payload->'event_payload', '{}'::jsonb),
    coalesce(v_payload_hash, v_idempotency),
    p_payload->>'parsed_code', p_payload->>'parsed_message', v_idempotency
  );

  v_to_axes := jsonb_build_object(
    'document_status', coalesce(v_inv.document_status, 'emessa'),
    'sdi_status', v_sdi,
    'fiscal_validity', v_fv
  );
  perform public.invoice_record_state_history(
    v_invoice_id, 'sdi_' || lower(v_canonical), v_from_axes, v_to_axes,
    'transmission', v_transmission_id, p_payload
  );

  if v_transmission_id is not null then
    update public.invoice_transmissions
    set transport_status = 'synced', last_event_at = now(),
        sdi_identifier = coalesce(v_sdi_id, sdi_identifier)
    where id = v_transmission_id;
  end if;

  perform public.invoice_insert_event(
    'invoice', v_invoice_id, 'invoice', v_invoice_id, v_invoice_id,
    'sdi', 'invoice_sdi_' || lower(v_canonical), gen_random_uuid(), null,
    jsonb_build_object(
      'canonical', v_canonical, 'raw_code', v_raw_code,
      'sdi_identifier', v_sdi_id, 'transmission_id', v_transmission_id
    ),
    null
  );

  return jsonb_build_object('ok', true, 'sdi_status', v_sdi, 'fiscal_validity', v_fv);
end;
$$;

revoke all on function public.apply_sdi_event(jsonb) from public, anon, authenticated;
grant execute on function public.apply_sdi_event(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- P1-SDI: handle_sdi_outcome — service_role only
-- ---------------------------------------------------------------------------
create or replace function public.handle_sdi_outcome(
  p_invoice_id uuid,
  p_outcome text,
  p_provider_reference text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service boolean;
  v_canonical text;
begin
  v_service := coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_setting('role', true) = 'service_role';
  if not v_service then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  v_canonical := upper(trim(p_outcome));
  if v_canonical in ('SUBMITTED', 'TECHNICAL_RECEIPT', 'ACCEPTED') then
    return jsonb_build_object('ok', true, 'transport_only', true, 'outcome', v_canonical);
  end if;

  return public.apply_sdi_event(jsonb_build_object(
    'invoice_id', p_invoice_id,
    'canonical_event_type', v_canonical,
    'raw_sdi_event_code', p_outcome,
    'idempotency_key', 'legacy_outcome:' || p_invoice_id::text || ':' || v_canonical || ':' || coalesce(p_provider_reference, ''),
    'payload_hash', coalesce(p_provider_reference, p_outcome),
    'parsed_message', p_reason
  ));
end;
$$;

revoke all on function public.handle_sdi_outcome(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.handle_sdi_outcome(uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- P2: invoice_fatturapa_snapshots — client INSERT revoked (service_role only)
-- ---------------------------------------------------------------------------
drop policy if exists cap_invoice_fatturapa_snapshots on public.invoice_fatturapa_snapshots;
drop policy if exists cap_invoice_fatturapa_snapshots_select on public.invoice_fatturapa_snapshots;

create policy cap_invoice_fatturapa_snapshots_select on public.invoice_fatturapa_snapshots
for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

-- ---------------------------------------------------------------------------
-- P1-IDOR: tenant guard on draft update + transition entrypoints
-- ponytail: patch via CREATE OR REPLACE head-only guard injection
-- ---------------------------------------------------------------------------
create or replace function public.update_invoice_draft_with_rows(p_invoice_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
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
  perform public.invoice_assert_tenant_access(p_invoice_id);

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
$fn$;

commit;

notify pgrst, 'reload schema';
