-- RLS audit fixes + storage_uploaded + archived events

begin;

drop policy if exists cap_document_capture_attempts_update on public.document_capture_attempts;
create policy cap_document_capture_attempts_update on public.document_capture_attempts for update to authenticated
using (false) with check (false);

-- finalize: storage_uploaded before finalized
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
begin
  if v_uid is null then raise exception 'Non autenticato'; end if;
  v_company := public.rbac_user_company_id();
  if v_company is null then raise exception 'Tenant non configurato per l''utente'; end if;
  if not public.rbac_module_can('document_capture', 'write') then raise exception 'Permesso negato'; end if;

  select * into dc from public.document_capture
  where id = p_capture_id and company_id = v_company and deleted_at is null for update;
  if not found then raise exception 'Capture non trovato'; end if;
  if dc.uploaded_by is distinct from v_uid then raise exception 'Permesso negato'; end if;

  if dc.finalized_at is not null then
    return jsonb_build_object('ok', true, 'id', dc.id, 'status', dc.status, 'finalizedAt', dc.finalized_at, 'duplicateOf', dc.duplicate_of);
  end if;

  if dc.status not in ('pending_upload', 'failed') then
    raise exception 'invalid_status_transition';
  end if;

  insert into public.document_capture_events (
    company_id, document_capture_id, event_type, idempotency_key, actor_id, payload
  ) values (
    v_company, p_capture_id, 'storage_uploaded', 'storage_uploaded', v_uid,
    jsonb_build_object('mime', p_mime, 'fileSizeBytes', p_file_size_bytes)
  ) on conflict (document_capture_id, idempotency_key) do nothing;

  select id into v_dup_id from public.document_capture
  where company_id = v_company and sha256 = p_sha256 and finalized_at is not null
    and deleted_at is null and id <> p_capture_id limit 1;

  if v_dup_id is not null then
    update public.document_capture
    set status = 'archived', duplicate_of = v_dup_id, sha256 = p_sha256, mime = p_mime,
        file_size_bytes = p_file_size_bytes, storage_version = p_storage_version,
        storage_etag = p_storage_etag, finalized_at = now(),
        capture_version = capture_version + 1, updated_at = now()
    where id = p_capture_id;

    insert into public.document_capture_events (
      company_id, document_capture_id, event_type, idempotency_key, actor_id, payload
    ) values (
      v_company, p_capture_id, 'duplicate_detected', 'duplicate_detected:' || left(p_sha256, 12), v_uid,
      jsonb_build_object('duplicateOf', v_dup_id, 'sha256Prefix', left(p_sha256, 12))
    ) on conflict (document_capture_id, idempotency_key) do nothing;

    return jsonb_build_object('ok', true, 'duplicateOf', v_dup_id, 'id', p_capture_id);
  end if;

  update public.document_capture
  set status = 'uploaded', sha256 = p_sha256, mime = p_mime, file_size_bytes = p_file_size_bytes,
      storage_version = p_storage_version, storage_etag = p_storage_etag,
      finalized_at = now(), capture_version = capture_version + 1, updated_at = now()
  where id = p_capture_id;

  insert into public.document_capture_events (
    company_id, document_capture_id, event_type, idempotency_key, actor_id, payload
  ) values (
    v_company, p_capture_id, 'finalized', 'finalized', v_uid,
    jsonb_build_object('sha256Prefix', left(p_sha256, 12), 'mime', p_mime, 'fileSizeBytes', p_file_size_bytes)
  ) on conflict (document_capture_id, idempotency_key) do nothing;

  return jsonb_build_object('ok', true, 'id', p_capture_id, 'status', 'uploaded');
end;
$$;

-- patch: emit archived when transitioning to archived
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
  if v_uid is null then raise exception 'Non autenticato'; end if;
  v_company := public.rbac_user_company_id();
  if v_company is null then raise exception 'Tenant non configurato per l''utente'; end if;
  if not public.rbac_module_can('document_capture', 'write') then raise exception 'Permesso negato'; end if;

  select * into dc from public.document_capture
  where id = p_capture_id and company_id = v_company and deleted_at is null for update;
  if not found then raise exception 'Capture non trovato'; end if;

  v_old_status := dc.status;

  if p_soft_delete then
    if p_deletion_reason is null or char_length(trim(p_deletion_reason)) < 3 then
      raise exception 'deletion_reason richiesto';
    end if;
    update public.document_capture
    set deleted_at = now(), deleted_by = v_uid, deletion_reason = trim(p_deletion_reason),
        capture_version = capture_version + 1, updated_at = now()
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
        capture_version = capture_version + 1, updated_at = now()
    where id = p_capture_id returning capture_version into v_new_version;

    if p_status = 'archived' and p_status is distinct from v_old_status then
      v_event_type := 'archived';
      v_idempotency := 'archived:' || v_new_version::text;
      v_payload := jsonb_build_object('previousStatus', v_old_status);
    elsif p_status is not null and p_status is distinct from v_old_status then
      v_event_type := 'status_changed';
      v_idempotency := 'status:' || v_old_status || ':' || p_status || ':' || v_new_version::text;
      v_payload := jsonb_build_object('previousStatus', v_old_status, 'newStatus', p_status, 'captureVersion', v_new_version);
    elsif p_lavorazione_id is not null or p_mezzo_id is not null or p_attrezzatura_id is not null then
      v_event_type := 'linked';
      v_idempotency := 'linked:' || v_new_version::text;
      v_payload := jsonb_build_object('lavorazioneId', p_lavorazione_id, 'mezzoId', p_mezzo_id, 'attrezzaturaId', p_attrezzatura_id, 'captureVersion', v_new_version);
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
  ) on conflict (document_capture_id, idempotency_key) do nothing;

  return jsonb_build_object('ok', true, 'id', p_capture_id);
end;
$$;

commit;
