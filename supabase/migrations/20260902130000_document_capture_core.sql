-- Document Capture module — core schema, RPC, storage, RLS (v3.3)

begin;

-- ---------------------------------------------------------------------------
-- companies + profiles.company_id (3-step)
-- ---------------------------------------------------------------------------

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  created_at timestamptz not null default now(),
  constraint companies_name_chk check (char_length(trim(name)) > 0)
);

insert into public.companies (id, name, slug)
values ('00000000-0000-4000-8000-000000000001'::uuid, 'Default', 'default')
on conflict (id) do nothing;

alter table public.profiles
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

update public.profiles
set company_id = '00000000-0000-4000-8000-000000000001'::uuid
where company_id is null;

alter table public.profiles
  alter column company_id set not null;

create index if not exists idx_profiles_company_id on public.profiles (company_id);

create or replace function public.rbac_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id from public.profiles p where p.id = auth.uid();
$$;

comment on function public.rbac_user_company_id() is
  'Tenant company per utente autenticato; NULL se profilo assente.';

grant execute on function public.rbac_user_company_id() to authenticated;

-- ---------------------------------------------------------------------------
-- document_capture
-- ---------------------------------------------------------------------------

create table if not exists public.document_capture (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  storage_path text not null,
  sha256 text,
  mime text,
  file_name text not null,
  file_size_bytes bigint,
  expected_mime text,
  storage_version text,
  storage_etag text,
  capture_version integer not null default 1,
  finalized_at timestamptz,
  duplicate_of uuid references public.document_capture (id) on delete set null,
  source text not null,
  document_category text not null default 'altro',
  scheda_tipo text,
  status text not null default 'pending_upload',
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  lavorazione_id uuid references public.lavorazioni (id) on delete set null,
  mezzo_id uuid references public.mezzi (id) on delete set null,
  attrezzatura_id uuid references public.attrezzature (id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  deletion_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_capture_scheda_tipo_chk check (
    scheda_tipo is null or document_category = 'scheda_officina'
  ),
  constraint document_capture_status_chk check (
    status in (
      'pending_upload', 'expired_upload', 'uploaded', 'review_required',
      'analyzing', 'review', 'dry_run', 'applied', 'archived', 'failed'
    )
  ),
  constraint document_capture_category_chk check (
    document_category in ('scheda_officina', 'documento_amministrativo', 'foto', 'altro')
  ),
  constraint document_capture_scheda_tipo_values_chk check (
    scheda_tipo is null or scheda_tipo in ('ingresso', 'lavorazioni', 'ricambi')
  ),
  constraint document_capture_finalized_sha_chk check (
    finalized_at is null or sha256 is not null
  ),
  constraint document_capture_deletion_reason_chk check (
    deleted_at is null or (deletion_reason is not null and char_length(trim(deletion_reason)) >= 3)
  )
);

create unique index if not exists uq_document_capture_company_sha256_finalized
  on public.document_capture (company_id, sha256)
  where deleted_at is null and finalized_at is not null and sha256 is not null;

create index if not exists idx_document_capture_company_status
  on public.document_capture (company_id, status)
  where deleted_at is null;

create index if not exists idx_document_capture_pending_ttl
  on public.document_capture (uploaded_at)
  where status = 'pending_upload' and finalized_at is null and deleted_at is null;

drop trigger if exists trg_document_capture_updated_at on public.document_capture;
create trigger trg_document_capture_updated_at
before update on public.document_capture
for each row execute function public.set_updated_at();

-- Immutabilità post-finalize
create or replace function public.document_capture_guard_post_finalize()
returns trigger
language plpgsql
as $$
begin
  if old.finalized_at is not null then
    if new.storage_path is distinct from old.storage_path
      or new.sha256 is distinct from old.sha256
      or new.mime is distinct from old.mime
      or new.file_size_bytes is distinct from old.file_size_bytes
      or new.company_id is distinct from old.company_id
      or new.storage_version is distinct from old.storage_version
      or new.storage_etag is distinct from old.storage_etag
    then
      raise exception 'document_capture immutabile dopo finalize';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_document_capture_guard_post_finalize on public.document_capture;
create trigger trg_document_capture_guard_post_finalize
before update on public.document_capture
for each row execute function public.document_capture_guard_post_finalize();

-- ---------------------------------------------------------------------------
-- document_capture_events (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.document_capture_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  document_capture_id uuid not null references public.document_capture (id) on delete restrict,
  event_type text not null,
  idempotency_key text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint document_capture_events_type_chk check (
    event_type in (
      'policy_created', 'storage_uploaded', 'finalized', 'duplicate_detected',
      'expiration', 'status_changed', 'category_changed', 'linked', 'archived', 'soft_deleted',
      'analyze_started', 'analyze_completed', 'analyze_failed',
      'dry_run', 'apply_started', 'apply_committed', 'apply_failed', 'apply_partial'
    )
  ),
  constraint document_capture_events_idempotency_uniq unique (document_capture_id, idempotency_key)
);

create index if not exists idx_document_capture_events_capture
  on public.document_capture_events (document_capture_id, created_at);

-- ---------------------------------------------------------------------------
-- Satellite tables (schema predisposto Fase 2/3)
-- ---------------------------------------------------------------------------

create table if not exists public.document_capture_attempts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  document_capture_id uuid not null references public.document_capture (id) on delete restrict,
  attempt_number integer not null,
  provider text not null,
  model text not null,
  prompt_version text,
  raw_response jsonb,
  structured_response jsonb,
  status text not null default 'pending',
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  estimated_cost_usd numeric(10, 6),
  duration_ms integer,
  provider_request_id text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_capture_attempts_status_chk check (
    status in ('pending', 'completed', 'failed')
  )
);

create index if not exists idx_document_capture_attempts_company_started
  on public.document_capture_attempts (company_id, started_at desc);

create table if not exists public.document_capture_fields (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  document_capture_id uuid not null references public.document_capture (id) on delete restrict,
  attempt_id uuid references public.document_capture_attempts (id) on delete set null,
  field_key text not null,
  raw_value text,
  normalized_value text,
  confirmed_value text,
  confidence numeric(5, 4),
  value_source text not null,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_capture_fields_source_chk check (
    value_source in ('ai', 'manual', 'existing')
  ),
  constraint document_capture_fields_confidence_chk check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

create unique index if not exists uq_document_capture_fields_key
  on public.document_capture_fields (document_capture_id, field_key);

create table if not exists public.document_capture_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  document_capture_id uuid not null references public.document_capture (id) on delete restrict,
  kind text not null,
  status text not null default 'pending',
  source_fields_hash text,
  capture_version integer,
  capture_updated_at timestamptz,
  plan_json jsonb not null default '{}'::jsonb,
  approved_creates_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  constraint document_capture_applications_kind_chk check (
    kind in ('dry_run', 'apply')
  ),
  constraint document_capture_applications_status_chk check (
    status in ('pending', 'committed', 'failed', 'rolled_back')
  )
);

create table if not exists public.scheda_pdf_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  tipo text not null,
  version text not null,
  layout_key text not null,
  renderer_hash text not null,
  params_schema_version text not null default '1',
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null,
  notes text,
  constraint scheda_pdf_templates_tipo_chk check (
    tipo in ('ingresso', 'lavorazioni', 'ricambi')
  ),
  constraint scheda_pdf_templates_company_tipo_version_uniq unique (company_id, tipo, version)
);

create table if not exists public.scheda_pdf_generations (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.scheda_pdf_templates (id) on delete restrict,
  renderer_hash text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles (id) on delete set null,
  artifact_hash text,
  params_json jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- RBAC helpers patch
-- ---------------------------------------------------------------------------

create or replace function public.rbac_resource_to_module(p_resource text)
returns text
language sql
immutable
as $$
  select case coalesce(p_resource, '')
    when 'mezzi' then 'mezzi'
    when 'lavorazioni' then 'lavorazioni'
    when 'scheda_lavorazione' then 'lavorazioni'
    when 'magazzino' then 'magazzino'
    when 'movimenti_ricambi' then 'magazzino'
    when 'documenti' then 'documenti'
    when 'document_capture' then 'document_capture'
    when 'preventivi' then 'preventivi'
    when 'report' then 'report'
    when 'ddt' then 'ddt'
    when 'attrezzature' then 'mezzi'
    else null
  end;
$$;

create or replace function public.rbac_log_entita_module(p_entita text)
returns text
language sql
immutable
as $$
  select case coalesce(p_entita, '')
    when 'mezzi' then 'mezzi'
    when 'lavorazioni' then 'lavorazioni'
    when 'magazzino' then 'magazzino'
    when 'magazzino_ricambi' then 'magazzino'
    when 'preventivi' then 'preventivi'
    when 'documenti' then 'documenti'
    when 'document_capture' then 'document_capture'
    else null
  end;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('document-capture', 'document-capture', false, 15 * 1024 * 1024)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create or replace function public.document_capture_storage_object_allowed(
  p_object_name text,
  p_op text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parts text[];
  v_company_id uuid;
  v_capture_id uuid;
  v_filename text;
  v_uid uuid := auth.uid();
  v_user_company uuid;
  dc record;
begin
  if v_uid is null then
    return false;
  end if;

  v_user_company := public.rbac_user_company_id();
  if v_user_company is null then
    return false;
  end if;

  v_parts := string_to_array(p_object_name, '/');
  if coalesce(array_length(v_parts, 1), 0) <> 4 then
    return false;
  end if;

  if v_parts[2] <> 'documents' then
    return false;
  end if;

  begin
    v_company_id := v_parts[1]::uuid;
    v_capture_id := v_parts[3]::uuid;
  exception when others then
    return false;
  end;

  v_filename := v_parts[4];
  if v_filename is null or trim(v_filename) = '' then
    return false;
  end if;

  if v_company_id is distinct from v_user_company then
    return false;
  end if;

  select * into dc
  from public.document_capture d
  where d.id = v_capture_id
    and d.company_id = v_company_id
    and d.deleted_at is null
  limit 1;

  if not found then
    return false;
  end if;

  if p_op = 'INSERT' then
    return dc.status = 'pending_upload'
      and dc.finalized_at is null
      and dc.uploaded_by = v_uid
      and public.rbac_module_can('document_capture', 'write');
  end if;

  if p_op = 'SELECT' then
    return dc.finalized_at is not null
      and public.rbac_module_can('document_capture', 'read');
  end if;

  return false;
end;
$$;

grant execute on function public.document_capture_storage_object_allowed(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- expire_pending_document_captures
-- ---------------------------------------------------------------------------

create or replace function public.expire_pending_document_captures(p_ttl interval default interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select id, company_id, uploaded_at
    from public.document_capture
    where status = 'pending_upload'
      and finalized_at is null
      and deleted_at is null
      and uploaded_at < now() - p_ttl
    for update skip locked
  loop
    update public.document_capture
    set status = 'expired_upload',
        capture_version = capture_version + 1,
        updated_at = now()
    where id = r.id;

    insert into public.document_capture_events (
      company_id, document_capture_id, event_type, idempotency_key, payload
    ) values (
      r.company_id,
      r.id,
      'expiration',
      'expiration:' || r.id::text,
      jsonb_build_object(
        'previousStatus', 'pending_upload',
        'newStatus', 'expired_upload',
        'pendingAgeHours', extract(epoch from (now() - r.uploaded_at)) / 3600
      )
    ) on conflict (document_capture_id, idempotency_key) do nothing;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.expire_pending_document_captures(interval) from public;
grant execute on function public.expire_pending_document_captures(interval) to authenticated;

-- pg_cron schedule (optional if extension present)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'expire-pending-document-captures';

    perform cron.schedule(
      'expire-pending-document-captures',
      '0 * * * *',
      $$select public.expire_pending_document_captures();$$
    );
  end if;
exception when others then
  null;
end;
$$;

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

commit;
