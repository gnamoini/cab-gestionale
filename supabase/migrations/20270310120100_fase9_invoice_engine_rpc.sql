-- FASE 9 — Invoice Engine RPC: apply_sdi_event, transmissions, state history, fix ACCEPTED bug.
begin;

-- ---------------------------------------------------------------------------
-- Record axis transition in immutable history
-- ---------------------------------------------------------------------------
create or replace function public.invoice_record_state_history(
  p_invoice_id uuid,
  p_event_code text,
  p_from_axes jsonb,
  p_to_axes jsonb,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.invoice_state_history (
    invoice_id, actor_id, event_code, from_axes, to_axes,
    reference_type, reference_id, metadata
  )
  values (
    p_invoice_id, public.rbac_auth_uid(), p_event_code, p_from_axes, p_to_axes,
    p_reference_type, p_reference_id, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- apply_sdi_event — sole writer of sdi_status + fiscal_validity (FASE 9)
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
  if not v_service and not (
    public.rbac_module_can('fatturazione', 'sdi_admin')
    or public.rbac_module_can('fatturazione', 'write')
  ) then
    raise exception 'Permesso negato';
  end if;

  v_invoice_id := (p_payload->>'invoice_id')::uuid;
  v_transmission_id := nullif(p_payload->>'transmission_id', '')::uuid;
  v_canonical := upper(trim(p_payload->>'canonical_event_type'));
  v_raw_code := nullif(trim(p_payload->>'raw_sdi_event_code'), '');
  v_idempotency := trim(p_payload->>'idempotency_key');
  v_payload_hash := trim(p_payload->>'payload_hash');
  v_provider_event_id := nullif(trim(p_payload->>'provider_event_id'), '');
  v_sdi_id := nullif(trim(p_payload->>'sdi_identifier'), '');

  if v_invoice_id is null or v_canonical is null or v_idempotency is null then
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

  -- REJECTED → handle_sdi_rejected (accounting reversal, idempotent)
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

  -- Map canonical SdI events to axes — provider_accepted is NOT here
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
    public.rbac_auth_uid(),
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
    public.rbac_auth_uid()
  );

  return jsonb_build_object('ok', true, 'sdi_status', v_sdi, 'fiscal_validity', v_fv);
end;
$$;

-- ---------------------------------------------------------------------------
-- Fix handle_sdi_outcome — ACCEPTED no longer sets validly_issued (FASE 9)
-- Delegates to apply_sdi_event for SdI outcomes; transport-only for SUBMITTED
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
  v_canonical text;
  v_raw text;
begin
  v_canonical := case upper(trim(p_outcome))
    when 'REJECTED' then 'REJECTED'
    when 'DELIVERED' then 'DELIVERY'
    when 'DELIVERY_FAILED' then 'DELIVERY_UNAVAILABLE'
    when 'SUBMITTED' then 'SUBMITTED'
    when 'ACCEPTED' then 'TECHNICAL_RECEIPT'
    else 'UNKNOWN'
  end;
  v_raw := case upper(trim(p_outcome))
    when 'DELIVERED' then 'RC'
    when 'DELIVERY_FAILED' then 'MC'
    when 'REJECTED' then 'NS'
    else null
  end;

  -- TECHNICAL_RECEIPT / ACCEPTED: do NOT change fiscal_validity
  if v_canonical = 'TECHNICAL_RECEIPT' then
    return jsonb_build_object('ok', true, 'transport_only', true, 'note', 'provider_accepted_not_sdi_outcome');
  end if;

  return public.apply_sdi_event(jsonb_build_object(
    'invoice_id', p_invoice_id,
    'canonical_event_type', v_canonical,
    'raw_sdi_event_code', v_raw,
    'idempotency_key', 'legacy-outcome:' || p_invoice_id::text || ':' || upper(trim(p_outcome)) || ':' || coalesce(p_provider_reference, ''),
    'payload_hash', md5(coalesce(p_provider_reference, '') || coalesce(p_reason, '')),
    'provider_event_id', p_provider_reference,
    'parsed_message', p_reason,
    'event_payload', jsonb_build_object('provider_reference', p_provider_reference, 'reason', p_reason)
  ));
end;
$$;

-- ---------------------------------------------------------------------------
-- enqueue_invoice_submission — creates transmission + job
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_invoice_submission(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_attempt integer;
  v_trans_id uuid;
  v_job_id uuid;
  v_xml_doc record;
  v_idem text;
  v_corr text;
begin
  if not public.rbac_module_can('fatturazione', 'write')
     and not public.rbac_module_can('fatturazione', 'sdi_admin') then
    raise exception 'Permesso negato';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Fattura non trovata'; end if;
  if coalesce(v_inv.document_status, '') <> 'emessa' then
    raise exception 'Fattura non emessa';
  end if;
  if coalesce(v_inv.sdi_status, '') not in ('generata', 'scartata', 'impossibilita_consegna') then
    raise exception 'Stato SdI non valido per invio: %', v_inv.sdi_status;
  end if;

  select * into v_xml_doc
  from public.invoice_xml_documents
  where invoice_id = p_invoice_id
  order by version desc
  limit 1;
  if not found then raise exception 'XML non generato'; end if;

  v_attempt := coalesce(v_inv.fiscal_transmission_attempt, 0) + 1;
  v_idem := p_invoice_id::text || ':transmission:' || v_attempt::text;
  v_corr := p_invoice_id::text || ':attempt:' || v_attempt::text;

  insert into public.invoice_transmissions (
    company_id, invoice_id, attempt_number, xml_document_id, xml_hash,
    transport_provider, transport_status, idempotency_key, submitted_at
  )
  values (
    v_inv.company_id, p_invoice_id, v_attempt, v_xml_doc.id, v_xml_doc.xml_sha256,
    'pending', 'queued', v_idem, now()
  )
  on conflict (idempotency_key) do update set updated_at = now()
  returning id into v_trans_id;

  if v_trans_id is null then
    select id into v_trans_id from public.invoice_transmissions where idempotency_key = v_idem;
  end if;

  update public.invoices set fiscal_transmission_attempt = v_attempt where id = p_invoice_id;

  insert into public.invoice_sdi_jobs (
    company_id, invoice_id, transmission_id, status, idempotency_key, correlation_key,
    xml_hash, provider
  )
  values (
    v_inv.company_id, p_invoice_id, v_trans_id, 'PENDING',
    v_idem, v_corr, v_xml_doc.xml_sha256, 'pending'
  )
  on conflict (idempotency_key) do nothing
  returning id into v_job_id;

  return jsonb_build_object(
    'ok', true, 'transmission_id', v_trans_id, 'job_id', v_job_id, 'attempt', v_attempt
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- store_invoice_xml_document — persist XML blob (service_role / sdi_admin)
-- ---------------------------------------------------------------------------
create or replace function public.store_invoice_xml_document(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_inv record;
  v_version integer;
  v_service boolean;
begin
  v_service := coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_setting('role', true) = 'service_role';
  if not v_service and not public.rbac_module_can('fatturazione', 'sdi_admin') then
    raise exception 'Permesso negato';
  end if;

  select * into v_inv from public.invoices
  where id = (p_payload->>'invoice_id')::uuid for update;
  if not found then raise exception 'Fattura non trovata'; end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.invoice_xml_documents where invoice_id = v_inv.id;

  insert into public.invoice_xml_documents (
    company_id, invoice_id, xml_content, xml_sha256, schema_version,
    generator_version, version, generated_by
  )
  values (
    v_inv.company_id, v_inv.id,
    p_payload->>'xml_content',
    p_payload->>'xml_sha256',
    coalesce(p_payload->>'schema_version', 'FPR12-v1.2.2'),
    coalesce(p_payload->>'generator_version', 'fase9-1.0'),
    v_version,
    public.rbac_auth_uid()
  )
  on conflict (invoice_id, xml_sha256) do update set generated_at = now()
  returning id into v_id;

  update public.invoices
  set sdi_status = 'generata',
      xml_schema_version = coalesce(p_payload->>'schema_version', 'FPR12-v1.2.2')
  where id = v_inv.id
    and coalesce(sdi_status, 'da_generare') in ('da_generare', 'scartata');

  perform public.invoice_write_status_axes(
    v_inv.id,
    coalesce(v_inv.document_status, 'emessa'),
    coalesce(v_inv.payment_status, 'non_pagata'),
    'generata',
    gen_random_uuid(), null, true, public.rbac_auth_uid(),
    'xml_generated', v_inv.fiscal_validity, v_inv.accounting_status
  );

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_correction_from_rejected — same fiscal identity, new XML attempt
-- ---------------------------------------------------------------------------
create or replace function public.create_correction_from_rejected(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
begin
  if not public.rbac_module_can('fatturazione', 'write')
     and not public.rbac_module_can('fatturazione', 'sdi_admin') then
    raise exception 'Permesso negato';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Fattura non trovata'; end if;
  if coalesce(v_inv.sdi_status, '') <> 'scartata' then
    raise exception 'Correzione consentita solo per fatture scartate';
  end if;
  if coalesce(v_inv.fiscal_validity, '') <> 'not_validly_issued' then
    raise exception 'FISCAL_VALIDITY_NOT_REJECTED';
  end if;

  perform public.invoice_write_status_axes(
    p_invoice_id,
    coalesce(v_inv.document_status, 'emessa'),
    coalesce(v_inv.payment_status, 'non_pagata'),
    'da_generare',
    gen_random_uuid(), null, true, public.rbac_auth_uid(),
    'correction_prepared', 'pending', v_inv.accounting_status
  );

  perform public.invoice_record_state_history(
    p_invoice_id, 'correction_prepared',
    jsonb_build_object('sdi_status', 'scartata', 'fiscal_validity', 'not_validly_issued'),
    jsonb_build_object('sdi_status', 'da_generare', 'fiscal_validity', 'pending'),
    'invoice', p_invoice_id,
    jsonb_build_object('numero', v_inv.numero, 'anno', v_inv.anno, 'series', v_inv.series)
  );

  return jsonb_build_object(
    'ok', true,
    'invoice_id', p_invoice_id,
    'numero', v_inv.numero,
    'anno', v_inv.anno,
    'series', v_inv.series,
    'message', 'Rigenerare XML e reinviare con stesso numero/data'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- reconcile_pending_transmissions — poll unresolved transport states
-- ---------------------------------------------------------------------------
create or replace function public.list_pending_reconciliation_transmissions(p_limit integer default 20)
returns setof public.invoice_transmissions
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     and current_setting('role', true) <> 'service_role' then
    raise exception 'Permesso negato';
  end if;
  return query
  select * from public.invoice_transmissions
  where transport_status = 'pending_reconciliation'
  order by updated_at asc
  limit p_limit;
end;
$$;

-- Grants
revoke all on function public.invoice_record_state_history(uuid, text, jsonb, jsonb, text, uuid, jsonb) from public, anon;
grant execute on function public.invoice_record_state_history(uuid, text, jsonb, jsonb, text, uuid, jsonb) to service_role;

revoke all on function public.apply_sdi_event(jsonb) from public, anon;
grant execute on function public.apply_sdi_event(jsonb) to authenticated, service_role;

revoke all on function public.enqueue_invoice_submission(uuid) from public, anon;
grant execute on function public.enqueue_invoice_submission(uuid) to authenticated, service_role;

revoke all on function public.store_invoice_xml_document(jsonb) from public, anon;
grant execute on function public.store_invoice_xml_document(jsonb) to service_role;

revoke all on function public.create_correction_from_rejected(uuid) from public, anon;
grant execute on function public.create_correction_from_rejected(uuid) to authenticated, service_role;

revoke all on function public.list_pending_reconciliation_transmissions(integer) from public, anon;
grant execute on function public.list_pending_reconciliation_transmissions(integer) to service_role;

commit;

notify pgrst, 'reload schema';
