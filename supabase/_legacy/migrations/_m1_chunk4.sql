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

-- ---------------------------------------------------------------------------
-- RPC: patch capture (status / links / soft delete) + event
-- ---------------------------------------------------------------------------

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
  ) on conflict (document_capture_id, idempotency_key) do nothing;

  return jsonb_build_object('ok', true, 'id', p_capture_id);
end;
$$;

revoke all on function public.document_capture_patch(uuid, text, text, text, uuid, uuid, uuid, boolean, text) from public;
grant execute on function public.document_capture_patch(uuid, text, text, text, uuid, uuid, uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.document_capture enable row level security;
alter table public.document_capture_events enable row level security;
alter table public.document_capture_attempts enable row level security;
alter table public.document_capture_fields enable row level security;
alter table public.document_capture_applications enable row level security;
alter table public.scheda_pdf_templates enable row level security;
alter table public.scheda_pdf_generations enable row level security;
alter table public.companies enable row level security;

drop policy if exists cap_companies_select on public.companies;
create policy cap_companies_select on public.companies for select to authenticated
using (id = public.rbac_user_company_id());

drop policy if exists cap_document_capture_select on public.document_capture;
create policy cap_document_capture_select on public.document_capture for select to authenticated
using (
  company_id = public.rbac_user_company_id()
  and public.rbac_user_company_id() is not null
  and public.rbac_module_can('document_capture', 'read')
  and deleted_at is null
  and (
    finalized_at is not null
    or uploaded_by = auth.uid()
  )
);

drop policy if exists cap_document_capture_insert on public.document_capture;
create policy cap_document_capture_insert on public.document_capture for insert to authenticated
with check (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'write')
);

drop policy if exists cap_document_capture_update on public.document_capture;
create policy cap_document_capture_update on public.document_capture for update to authenticated
using (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'write')
  and deleted_at is null
)
with check (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'write')
);

drop policy if exists cap_document_capture_events_select on public.document_capture_events;
create policy cap_document_capture_events_select on public.document_capture_events for select to authenticated
using (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'read')
  and exists (
    select 1 from public.document_capture dc
    where dc.id = document_capture_events.document_capture_id
      and dc.company_id = document_capture_events.company_id
      and dc.deleted_at is null
  )
);

drop policy if exists cap_document_capture_events_insert on public.document_capture_events;
create policy cap_document_capture_events_insert on public.document_capture_events for insert to authenticated
with check (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'write')
);

-- Child tables: read/write via parent EXISTS
drop policy if exists cap_document_capture_attempts_select on public.document_capture_attempts;
create policy cap_document_capture_attempts_select on public.document_capture_attempts for select to authenticated
using (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'read')
  and exists (
    select 1 from public.document_capture dc
    where dc.id = document_capture_attempts.document_capture_id
      and dc.company_id = document_capture_attempts.company_id
      and dc.deleted_at is null
  )
);

drop policy if exists cap_document_capture_fields_select on public.document_capture_fields;
create policy cap_document_capture_fields_select on public.document_capture_fields for select to authenticated
using (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'read')
  and exists (
    select 1 from public.document_capture dc
    where dc.id = document_capture_fields.document_capture_id
      and dc.company_id = document_capture_fields.company_id
      and dc.deleted_at is null
  )
);

drop policy if exists cap_document_capture_applications_select on public.document_capture_applications;
create policy cap_document_capture_applications_select on public.document_capture_applications for select to authenticated
using (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'read')
  and exists (
    select 1 from public.document_capture dc
    where dc.id = document_capture_applications.document_capture_id
      and dc.company_id = document_capture_applications.company_id
      and dc.deleted_at is null
  )
);

drop policy if exists cap_scheda_pdf_templates_select on public.scheda_pdf_templates;
create policy cap_scheda_pdf_templates_select on public.scheda_pdf_templates for select to authenticated
using (
  company_id = public.rbac_user_company_id()
  and public.rbac_module_can('document_capture', 'read')
);

-- Storage policies
drop policy if exists cap_document_capture_storage_insert on storage.objects;
create policy cap_document_capture_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'document-capture'
  and public.document_capture_storage_object_allowed(name, 'INSERT')
);

drop policy if exists cap_document_capture_storage_select on storage.objects;
create policy cap_document_capture_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'document-capture'
  and public.document_capture_storage_object_allowed(name, 'SELECT')
);
