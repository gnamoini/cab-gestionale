-- Document Capture Phase 2/3 RPC + fields_confirmed event + attempts.error_code

begin;

alter table public.document_capture_attempts
  add column if not exists error_code text;

alter table public.document_capture_events
  drop constraint if exists document_capture_events_type_chk;

alter table public.document_capture_events
  add constraint document_capture_events_type_chk check (
    event_type in (
      'policy_created', 'storage_uploaded', 'finalized', 'duplicate_detected',
      'expiration', 'status_changed', 'category_changed', 'linked', 'archived', 'soft_deleted',
      'analyze_started', 'analyze_completed', 'analyze_failed', 'fields_confirmed',
      'dry_run', 'apply_started', 'apply_committed', 'apply_failed', 'apply_partial'
    )
  );

create or replace function public.document_capture_mutate_with_event(
  p_capture_id uuid,
  p_event_type text,
  p_idempotency_key text,
  p_payload jsonb default '{}'::jsonb,
  p_new_status text default null,
  p_lavorazione_id uuid default null,
  p_mezzo_id uuid default null,
  p_attrezzatura_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  dc record;
  v_old_status text;
  v_new_version integer;
begin
  if v_uid is null then
    raise exception 'Non autenticato';
  end if;

  v_company := public.rbac_user_company_id();
  if v_company is null then
    raise exception 'Tenant non configurato per l''utente';
  end if;

  if not public.rbac_module_can('document_capture', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into dc
  from public.document_capture
  where id = p_capture_id
    and company_id = v_company
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Capture non trovato';
  end if;

  v_old_status := dc.status;

  if p_new_status is not null and p_new_status is distinct from v_old_status then
    perform public.document_capture_assert_status_transition(v_old_status, p_new_status);
  end if;

  update public.document_capture
  set status = coalesce(p_new_status, status),
      lavorazione_id = coalesce(p_lavorazione_id, lavorazione_id),
      mezzo_id = coalesce(p_mezzo_id, mezzo_id),
      attrezzatura_id = coalesce(p_attrezzatura_id, attrezzatura_id),
      capture_version = case
        when p_new_status is not null and p_new_status is distinct from v_old_status then capture_version + 1
        when p_lavorazione_id is not null or p_mezzo_id is not null or p_attrezzatura_id is not null then capture_version + 1
        else capture_version
      end,
      updated_at = now()
  where id = p_capture_id
  returning capture_version into v_new_version;

  insert into public.document_capture_events (
    company_id, document_capture_id, event_type, idempotency_key, actor_id, payload
  ) values (
    v_company,
    p_capture_id,
    p_event_type,
    p_idempotency_key,
    v_uid,
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
      'captureVersion', v_new_version,
      'previousStatus', v_old_status,
      'newStatus', coalesce(p_new_status, v_old_status)
    )
  )
  on conflict (document_capture_id, idempotency_key) do nothing;

  return jsonb_build_object(
    'ok', true,
    'captureId', p_capture_id,
    'captureVersion', v_new_version,
    'status', coalesce(p_new_status, v_old_status)
  );
end;
$$;

revoke all on function public.document_capture_mutate_with_event(uuid, text, text, jsonb, text, uuid, uuid, uuid) from public;
grant execute on function public.document_capture_mutate_with_event(uuid, text, text, jsonb, text, uuid, uuid, uuid) to authenticated;

-- Patch RPC: enforce status transitions
create or replace function public.document_capture_patch(
  p_capture_id uuid,
  p_status text default null,
  p_document_category text default null,
  p_scheda_tipo text default null,
  p_lavorazione_id uuid default null,
  p_mezzo_id uuid default null,
  p_attrezzatura_id uuid default null,
  p_soft_delete boolean default false,
  p_deletion_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  dc record;
  v_old_status text;
  v_new_version integer;
  v_event_type text;
  v_idempotency text;
  v_payload jsonb := '{}'::jsonb;
begin
  if v_uid is null then
    raise exception 'Non autenticato';
  end if;

  v_company := public.rbac_user_company_id();
  if v_company is null then
    raise exception 'Tenant non configurato per l''utente';
  end if;

  if not public.rbac_module_can('document_capture', 'write') then
    raise exception 'Permesso negato';
  end if;

  select * into dc
  from public.document_capture
  where id = p_capture_id
    and company_id = v_company
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Capture non trovato';
  end if;

  v_old_status := dc.status;

  if p_soft_delete then
    if p_deletion_reason is null or char_length(trim(p_deletion_reason)) < 3 then
      raise exception 'deletion_reason richiesto';
    end if;
    update public.document_capture
    set deleted_at = now(),
        deleted_by = v_uid,
        deletion_reason = trim(p_deletion_reason),
        capture_version = capture_version + 1,
        updated_at = now()
    where id = p_capture_id;

    v_event_type := 'soft_deleted';
    v_idempotency := 'soft_deleted:' || (dc.capture_version + 1)::text;
    v_payload := jsonb_build_object('deletionReason', trim(p_deletion_reason), 'previousStatus', v_old_status);
  else
    if p_status is not null and p_status is distinct from v_old_status then
      perform public.document_capture_assert_status_transition(v_old_status, p_status);
    end if;

    update public.document_capture
    set status = coalesce(p_status, status),
        document_category = coalesce(p_document_category, document_category),
        scheda_tipo = case when p_document_category is not null then p_scheda_tipo else coalesce(p_scheda_tipo, scheda_tipo) end,
        lavorazione_id = coalesce(p_lavorazione_id, lavorazione_id),
        mezzo_id = coalesce(p_mezzo_id, mezzo_id),
        attrezzatura_id = coalesce(p_attrezzatura_id, attrezzatura_id),
        capture_version = capture_version + 1,
        updated_at = now()
    where id = p_capture_id
    returning capture_version into v_new_version;

    if p_status is not null and p_status is distinct from v_old_status then
      v_event_type := 'status_changed';
      v_idempotency := 'status:' || v_old_status || ':' || p_status || ':' || v_new_version::text;
      v_payload := jsonb_build_object('previousStatus', v_old_status, 'newStatus', p_status, 'captureVersion', v_new_version);
    elsif p_lavorazione_id is not null or p_mezzo_id is not null or p_attrezzatura_id is not null then
      v_event_type := 'linked';
      v_idempotency := 'linked:' || v_new_version::text;
      v_payload := jsonb_build_object(
        'lavorazioneId', p_lavorazione_id,
        'mezzoId', p_mezzo_id,
        'attrezzaturaId', p_attrezzatura_id,
        'captureVersion', v_new_version
      );
    elsif p_document_category is not null then
      v_event_type := 'category_changed';
      v_idempotency := 'category:' || v_new_version::text;
      v_payload := jsonb_build_object('documentCategory', p_document_category, 'schedaTipo', p_scheda_tipo);
    else
      return jsonb_build_object('ok', true, 'id', p_capture_id);
    end if;
  end if;

  insert into public.document_capture_events (
    company_id, document_capture_id, event_type, idempotency_key, actor_id, payload
  ) values (
    v_company, p_capture_id, v_event_type, v_idempotency, v_uid, v_payload
  )
  on conflict (document_capture_id, idempotency_key) do nothing;

  return jsonb_build_object('ok', true, 'id', p_capture_id);
end;
$$;

commit;
