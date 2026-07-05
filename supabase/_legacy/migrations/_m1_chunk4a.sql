-- ---------------------------------------------------------------------------
-- RPC: finalize (FOR UPDATE txn)
-- ---------------------------------------------------------------------------

create or replace function public.document_capture_finalize(
  p_capture_id uuid,
  p_sha256 text,
  p_mime text,
  p_file_size_bytes bigint,
  p_storage_version text default null,
  p_storage_etag text default null
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
  v_dup_id uuid;
  v_result jsonb;
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

  if dc.uploaded_by is distinct from v_uid then
    raise exception 'Permesso negato';
  end if;

  if dc.finalized_at is not null then
    return jsonb_build_object(
      'ok', true,
      'id', dc.id,
      'status', dc.status,
      'finalizedAt', dc.finalized_at,
      'duplicateOf', dc.duplicate_of
    );
  end if;

  if dc.status not in ('pending_upload', 'failed') then
    raise exception 'invalid_status_transition';
  end if;

  select id into v_dup_id
  from public.document_capture
  where company_id = v_company
    and sha256 = p_sha256
    and finalized_at is not null
    and deleted_at is null
    and id <> p_capture_id
  limit 1;

  if v_dup_id is not null then
    update public.document_capture
    set status = 'archived',
        duplicate_of = v_dup_id,
        sha256 = p_sha256,
        mime = p_mime,
        file_size_bytes = p_file_size_bytes,
        storage_version = p_storage_version,
        storage_etag = p_storage_etag,
        finalized_at = now(),
        capture_version = capture_version + 1,
        updated_at = now()
    where id = p_capture_id;

    insert into public.document_capture_events (
      company_id, document_capture_id, event_type, idempotency_key, actor_id, payload
    ) values (
      v_company, p_capture_id, 'duplicate_detected',
      'duplicate_detected:' || left(p_sha256, 12),
      v_uid,
      jsonb_build_object('duplicateOf', v_dup_id, 'sha256Prefix', left(p_sha256, 12))
    ) on conflict (document_capture_id, idempotency_key) do nothing;

    return jsonb_build_object('ok', true, 'duplicateOf', v_dup_id, 'id', p_capture_id);
  end if;

  update public.document_capture
  set status = 'uploaded',
      sha256 = p_sha256,
      mime = p_mime,
      file_size_bytes = p_file_size_bytes,
      storage_version = p_storage_version,
      storage_etag = p_storage_etag,
      finalized_at = now(),
      capture_version = capture_version + 1,
      updated_at = now()
  where id = p_capture_id;

  insert into public.document_capture_events (
    company_id, document_capture_id, event_type, idempotency_key, actor_id, payload
  ) values (
    v_company, p_capture_id, 'finalized', 'finalized', v_uid,
    jsonb_build_object(
      'sha256Prefix', left(p_sha256, 12),
      'mime', p_mime,
      'fileSizeBytes', p_file_size_bytes
    )
  ) on conflict (document_capture_id, idempotency_key) do nothing;

  return jsonb_build_object('ok', true, 'id', p_capture_id, 'status', 'uploaded');
end;
$$;

revoke all on function public.document_capture_finalize(uuid, text, text, bigint, text, text) from public;
grant execute on function public.document_capture_finalize(uuid, text, text, bigint, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: create upload policy row
-- ---------------------------------------------------------------------------

create or replace function public.document_capture_create_upload_policy(
  p_capture_id uuid,
  p_file_name text,
  p_expected_mime text,
  p_expected_size_bytes bigint,
  p_source text,
  p_document_category text default 'altro',
  p_scheda_tipo text default null,
  p_lavorazione_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  v_storage_path text;
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

  v_storage_path := v_company::text || '/documents/' || p_capture_id::text || '/' || p_file_name;

  insert into public.document_capture (
    id, company_id, storage_path, file_name, expected_mime, source,
    document_category, scheda_tipo, status, uploaded_by, lavorazione_id
  ) values (
    p_capture_id, v_company, v_storage_path, p_file_name, p_expected_mime, p_source,
    coalesce(p_document_category, 'altro'), p_scheda_tipo, 'pending_upload', v_uid, p_lavorazione_id
  );

  insert into public.document_capture_events (
    company_id, document_capture_id, event_type, idempotency_key, actor_id, payload
  ) values (
    v_company, p_capture_id, 'policy_created', 'policy_created', v_uid,
    jsonb_build_object(
      'fileName', p_file_name,
      'expectedMime', p_expected_mime,
      'expectedSizeBytes', p_expected_size_bytes,
      'source', p_source,
      'documentCategory', p_document_category
    )
  ) on conflict (document_capture_id, idempotency_key) do nothing;

  return jsonb_build_object(
    'captureId', p_capture_id,
    'bucket', 'document-capture',
    'path', v_storage_path,
    'expiresAt', (now() + interval '24 hours')
  );
end;
$$;

revoke all on function public.document_capture_create_upload_policy(uuid, text, text, bigint, text, text, text, uuid) from public;
grant execute on function public.document_capture_create_upload_policy(uuid, text, text, bigint, text, text, text, uuid) to authenticated;