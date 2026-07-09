-- Temporary import files — core schema, storage, RPC lifecycle (v1)

begin;

-- ---------------------------------------------------------------------------
-- import_files
-- ---------------------------------------------------------------------------

create table if not exists public.import_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  kind text not null,
  import_session_id uuid,
  storage_path text,
  file_name text not null,
  mime text,
  sha256 text,
  file_size_bytes bigint,
  status text not null default 'uploaded',
  failed_reason_code text,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  processed_by uuid references public.profiles (id) on delete set null,
  processing_started_at timestamptz,
  processing_by uuid references public.profiles (id) on delete set null,
  processing_attempts integer not null default 0,
  last_error jsonb,
  storage_cleanup_status text,
  expires_at timestamptz not null,
  processed_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_files_kind_chk check (
    kind in ('ordine_fornitore', 'listino', 'magazzino', 'ai_input')
  ),
  constraint import_files_status_chk check (
    status in ('uploaded', 'processing', 'processed', 'failed', 'cancelled', 'expired')
  ),
  constraint import_files_failed_reason_code_chk check (
    failed_reason_code is null or failed_reason_code in (
      'AI_PARSE_ERROR', 'INVALID_DOCUMENT', 'TIMEOUT', 'USER_CANCELLED', 'STORAGE_ERROR', 'UNKNOWN'
    )
  ),
  constraint import_files_storage_cleanup_status_chk check (
    storage_cleanup_status is null or storage_cleanup_status in ('pending', 'deleted', 'failed')
  ),
  constraint import_files_meta_obj_chk check (jsonb_typeof(meta) = 'object'),
  constraint import_files_last_error_obj_chk check (
    last_error is null or jsonb_typeof(last_error) = 'object'
  )
);

create index if not exists idx_import_files_status_expires
  on public.import_files (status, expires_at);

create index if not exists idx_import_files_company_sha256
  on public.import_files (company_id, sha256)
  where sha256 is not null;

create index if not exists idx_import_files_uploaded_by_status
  on public.import_files (uploaded_by, status);

create index if not exists idx_import_files_failed_reason
  on public.import_files (failed_reason_code, created_at desc)
  where failed_reason_code is not null;

create index if not exists idx_import_files_storage_cleanup_pending
  on public.import_files (storage_cleanup_status)
  where storage_cleanup_status = 'pending';

drop trigger if exists trg_import_files_updated_at on public.import_files;
create trigger trg_import_files_updated_at
before update on public.import_files
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- import_file_results
-- ---------------------------------------------------------------------------

create table if not exists public.import_file_results (
  id uuid primary key default gen_random_uuid(),
  import_file_id uuid not null references public.import_files (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint import_file_results_meta_obj_chk check (jsonb_typeof(meta) = 'object'),
  constraint import_file_results_entity_uniq unique (import_file_id, entity_type, entity_id)
);

create index if not exists idx_import_file_results_import_file
  on public.import_file_results (import_file_id);

-- ---------------------------------------------------------------------------
-- ordini_fornitori_import_log — nullable documento, link import file
-- ---------------------------------------------------------------------------

alter table public.ordini_fornitori_import_log
  alter column documento_id drop not null;

alter table public.ordini_fornitori_import_log
  add column if not exists import_file_id uuid references public.import_files (id) on delete set null;

create index if not exists idx_ordini_fornitori_import_log_import_file
  on public.ordini_fornitori_import_log (import_file_id)
  where import_file_id is not null;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.import_file_kind_to_module(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'ordine_fornitore' then 'ordini_fornitori'
    when 'listino' then 'magazzino'
    when 'magazzino' then 'magazzino'
    when 'ai_input' then 'document_capture'
    else null
  end;
$$;

grant execute on function public.import_file_kind_to_module(text) to authenticated;

create or replace function public.import_file_storage_object_allowed(
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
  v_file_id uuid;
  v_uid uuid := auth.uid();
  v_row record;
begin
  if v_uid is null then return false; end if;

  v_parts := string_to_array(p_object_name, '/');
  if array_length(v_parts, 1) < 5 then return false; end if;
  if v_parts[2] <> 'imports' then return false; end if;

  begin
    v_company_id := v_parts[1]::uuid;
    v_file_id := v_parts[4]::uuid;
  exception when others then
    return false;
  end;

  select f.* into v_row
  from public.import_files f
  where f.id = v_file_id
    and f.company_id = v_company_id;

  if not found then return false; end if;

  if p_op = 'INSERT' then
    return v_row.uploaded_by = v_uid
      and v_row.status in ('uploaded', 'processing')
      and public.rbac_module_can(public.import_file_kind_to_module(v_row.kind), 'write');
  end if;

  if p_op = 'SELECT' then
    return v_row.uploaded_by = v_uid
      and v_row.status not in ('cancelled', 'expired');
  end if;

  return false;
end;
$$;

revoke all on function public.import_file_storage_object_allowed(text, text) from public;
grant execute on function public.import_file_storage_object_allowed(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('import-sources', 'import-sources', false, 15 * 1024 * 1024)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists cap_import_sources_storage_insert on storage.objects;
create policy cap_import_sources_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'import-sources'
  and public.import_file_storage_object_allowed(name, 'INSERT')
);

drop policy if exists cap_import_sources_storage_select on storage.objects;
create policy cap_import_sources_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'import-sources'
  and public.import_file_storage_object_allowed(name, 'SELECT')
);

-- ---------------------------------------------------------------------------
-- RPC: create upload policy
-- ---------------------------------------------------------------------------

create or replace function public.import_file_create_upload_policy(
  p_file_id uuid,
  p_kind text,
  p_file_name text,
  p_expected_mime text,
  p_expected_size_bytes bigint,
  p_import_session_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  v_module text;
  v_storage_path text;
  v_expires timestamptz;
begin
  if v_uid is null then raise exception 'Non autenticato'; end if;

  v_company := public.rbac_user_company_id();
  if v_company is null then raise exception 'Tenant non configurato per l''utente'; end if;

  v_module := public.import_file_kind_to_module(p_kind);
  if v_module is null then raise exception 'Tipo import non valido'; end if;

  if not public.rbac_module_can(v_module, 'write') then
    raise exception 'Permesso negato';
  end if;

  if p_expected_size_bytes <= 0 or p_expected_size_bytes > 15 * 1024 * 1024 then
    raise exception 'Dimensione file non valida';
  end if;

  v_storage_path := v_company::text || '/imports/' || p_kind || '/' || p_file_id::text || '/' || p_file_name;
  v_expires := now() + interval '24 hours';

  insert into public.import_files (
    id, company_id, kind, import_session_id, storage_path, file_name, mime,
    file_size_bytes, status, uploaded_by, expires_at, meta
  ) values (
    p_file_id, v_company, p_kind, p_import_session_id, v_storage_path, p_file_name, p_expected_mime,
    p_expected_size_bytes, 'uploaded', v_uid, v_expires, '{}'::jsonb
  );

  return jsonb_build_object(
    'fileId', p_file_id,
    'bucket', 'import-sources',
    'path', v_storage_path,
    'expiresAt', v_expires
  );
end;
$$;

revoke all on function public.import_file_create_upload_policy(uuid, text, text, text, bigint, uuid) from public;
grant execute on function public.import_file_create_upload_policy(uuid, text, text, text, bigint, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: finalize
-- ---------------------------------------------------------------------------

create or replace function public.import_file_finalize(
  p_file_id uuid,
  p_sha256 text,
  p_mime text,
  p_file_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  f record;
begin
  if v_uid is null then raise exception 'Non autenticato'; end if;
  v_company := public.rbac_user_company_id();
  if v_company is null then raise exception 'Tenant non configurato'; end if;

  select * into f from public.import_files
  where id = p_file_id and company_id = v_company
  for update;

  if not found then raise exception 'Import file non trovato'; end if;
  if f.uploaded_by <> v_uid then raise exception 'Permesso negato'; end if;
  if f.status <> 'uploaded' then raise exception 'invalid_status_transition'; end if;

  update public.import_files
  set sha256 = p_sha256,
      mime = p_mime,
      file_size_bytes = p_file_size_bytes,
      updated_at = now()
  where id = p_file_id;

  return jsonb_build_object('ok', true, 'id', p_file_id, 'sha256', p_sha256);
end;
$$;

revoke all on function public.import_file_finalize(uuid, text, text, bigint) from public;
grant execute on function public.import_file_finalize(uuid, text, text, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: cancel
-- ---------------------------------------------------------------------------

create or replace function public.import_file_cancel(p_file_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  f record;
  v_path text;
begin
  if v_uid is null then raise exception 'Non autenticato'; end if;
  v_company := public.rbac_user_company_id();
  if v_company is null then raise exception 'Tenant non configurato'; end if;

  select * into f from public.import_files
  where id = p_file_id and company_id = v_company
  for update;

  if not found then raise exception 'Import file non trovato'; end if;
  if f.uploaded_by <> v_uid then raise exception 'Permesso negato'; end if;
  if f.status <> 'uploaded' then raise exception 'invalid_status_transition'; end if;

  v_path := f.storage_path;

  update public.import_files
  set status = 'cancelled',
      failed_reason_code = 'USER_CANCELLED',
      cancelled_at = now(),
      storage_path = null,
      storage_cleanup_status = case when v_path is not null then 'pending' else null end,
      meta = case
        when v_path is not null then jsonb_set(coalesce(meta, '{}'::jsonb), '{storage_path_at_expire}', to_jsonb(v_path))
        else meta
      end,
      updated_at = now()
  where id = p_file_id;

  return jsonb_build_object('ok', true, 'id', p_file_id, 'status', 'cancelled');
end;
$$;

revoke all on function public.import_file_cancel(uuid) from public;
grant execute on function public.import_file_cancel(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: begin processing
-- ---------------------------------------------------------------------------

create or replace function public.import_file_begin_processing(p_file_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  f record;
  v_module text;
begin
  if v_uid is null then raise exception 'Non autenticato'; end if;
  v_company := public.rbac_user_company_id();
  if v_company is null then raise exception 'Tenant non configurato'; end if;

  select * into f from public.import_files
  where id = p_file_id and company_id = v_company
  for update;

  if not found then raise exception 'Import file non trovato'; end if;

  v_module := public.import_file_kind_to_module(f.kind);
  if f.uploaded_by <> v_uid and not public.rbac_module_can(v_module, 'write') then
    raise exception 'Permesso negato';
  end if;

  if f.status = 'processing'
    and f.processing_started_at is not null
    and f.processing_started_at > now() - interval '5 minutes'
    and f.processing_by is distinct from v_uid
  then
    raise exception 'processing_in_progress';
  end if;

  if f.status not in ('uploaded', 'failed') then
    raise exception 'invalid_status_transition';
  end if;

  update public.import_files
  set status = 'processing',
      processing_started_at = now(),
      processing_by = v_uid,
      processing_attempts = processing_attempts + 1,
      updated_at = now()
  where id = p_file_id;

  return jsonb_build_object('ok', true, 'id', p_file_id, 'status', 'processing');
end;
$$;

revoke all on function public.import_file_begin_processing(uuid) from public;
grant execute on function public.import_file_begin_processing(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: complete processing
-- ---------------------------------------------------------------------------

create or replace function public.import_file_complete_processing(
  p_file_id uuid,
  p_outcome text,
  p_failed_reason_code text default null,
  p_last_error jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  f record;
  v_module text;
  v_new_status text;
begin
  if v_uid is null then raise exception 'Non autenticato'; end if;
  v_company := public.rbac_user_company_id();
  if v_company is null then raise exception 'Tenant non configurato'; end if;

  if p_outcome not in ('processed', 'failed') then
    raise exception 'Esito non valido';
  end if;

  select * into f from public.import_files
  where id = p_file_id and company_id = v_company
  for update;

  if not found then raise exception 'Import file non trovato'; end if;

  v_module := public.import_file_kind_to_module(f.kind);
  if f.processing_by <> v_uid and f.uploaded_by <> v_uid
     and not public.rbac_module_can(v_module, 'write') then
    raise exception 'Permesso negato';
  end if;

  if f.status <> 'processing' then raise exception 'invalid_status_transition'; end if;

  v_new_status := p_outcome;

  update public.import_files
  set status = v_new_status,
      processed_by = case when p_outcome = 'processed' then v_uid else processed_by end,
      processed_at = case when p_outcome = 'processed' then now() else processed_at end,
      failed_reason_code = case when p_outcome = 'failed' then coalesce(p_failed_reason_code, 'UNKNOWN') else failed_reason_code end,
      last_error = case when p_outcome = 'failed' then coalesce(p_last_error, '{}'::jsonb) else last_error end,
      expires_at = case
        when p_outcome = 'processed' then now() + interval '24 hours'
        when p_outcome = 'failed' then now() + interval '7 days'
        else expires_at
      end,
      updated_at = now()
  where id = p_file_id;

  return jsonb_build_object('ok', true, 'id', p_file_id, 'status', v_new_status);
end;
$$;

revoke all on function public.import_file_complete_processing(uuid, text, text, jsonb) from public;
grant execute on function public.import_file_complete_processing(uuid, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: expire (lifecycle audit — no storage delete)
-- ---------------------------------------------------------------------------

create or replace function public.expire_import_files(
  p_uploaded_ttl interval default interval '24 hours',
  p_processed_ttl interval default interval '24 hours',
  p_failed_ttl interval default interval '7 days'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
  v_path text;
begin
  for r in
    select id, storage_path, status, created_at, processed_at, cancelled_at, expires_at
    from public.import_files
    where status in ('uploaded', 'cancelled', 'processed', 'failed')
      and (
        (status in ('uploaded', 'cancelled') and coalesce(cancelled_at, created_at) < now() - p_uploaded_ttl)
        or (status = 'processed' and processed_at is not null and processed_at < now() - p_processed_ttl)
        or (status = 'failed' and updated_at < now() - p_failed_ttl)
        or expires_at < now()
      )
    for update skip locked
  loop
    v_path := r.storage_path;

    update public.import_files
    set status = 'expired',
        expired_at = now(),
        storage_path = null,
        storage_cleanup_status = case when v_path is not null then 'pending' else storage_cleanup_status end,
        meta = case
          when v_path is not null then jsonb_set(coalesce(meta, '{}'::jsonb), '{storage_path_at_expire}', to_jsonb(v_path))
          else meta
        end,
        updated_at = now()
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.expire_import_files(interval, interval, interval) from public;
grant execute on function public.expire_import_files(interval, interval, interval) to service_role;

-- ---------------------------------------------------------------------------
-- RPC: cleanup storage (physical delete, retry-safe)
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_import_storage(p_batch_size integer default 100)
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_count integer := 0;
  r record;
  v_path text;
begin
  for r in
    select id, meta
    from public.import_files
    where storage_cleanup_status = 'pending'
      and meta ? 'storage_path_at_expire'
    order by updated_at
    limit p_batch_size
    for update skip locked
  loop
    v_path := r.meta->>'storage_path_at_expire';
    if v_path is null or length(trim(v_path)) = 0 then
      update public.import_files
      set storage_cleanup_status = 'deleted', updated_at = now()
      where id = r.id;
      v_count := v_count + 1;
      continue;
    end if;

    begin
      delete from storage.objects
      where bucket_id = 'import-sources' and name = v_path;

      update public.import_files
      set storage_cleanup_status = 'deleted',
          updated_at = now()
      where id = r.id;
      v_count := v_count + 1;
    exception when others then
      update public.import_files
      set storage_cleanup_status = 'failed',
          meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{storage_cleanup_error}', to_jsonb(SQLERRM)),
          updated_at = now()
      where id = r.id;
    end;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.cleanup_import_storage(integer) from public;
grant execute on function public.cleanup_import_storage(integer) to service_role;

-- pg_cron (optional)
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'expire-import-files';
    perform cron.schedule(
      'expire-import-files',
      '0 * * * *',
      $cron$select public.expire_import_files(); select public.cleanup_import_storage();$cron$
    );
  end if;
exception when others then
  null;
end;
$do$;

-- ---------------------------------------------------------------------------
-- RLS import_files
-- ---------------------------------------------------------------------------

alter table public.import_files enable row level security;
alter table public.import_file_results enable row level security;

drop policy if exists cap_import_files_select on public.import_files;
create policy cap_import_files_select on public.import_files for select to authenticated
using (
  company_id = public.rbac_user_company_id()
  and (
    uploaded_by = auth.uid()
    or public.rbac_module_can(public.import_file_kind_to_module(kind), 'write')
  )
);

drop policy if exists cap_import_files_insert on public.import_files;
create policy cap_import_files_insert on public.import_files for insert to authenticated
with check (
  company_id = public.rbac_user_company_id()
  and uploaded_by = auth.uid()
  and public.rbac_module_can(public.import_file_kind_to_module(kind), 'write')
);

drop policy if exists cap_import_files_update on public.import_files;
create policy cap_import_files_update on public.import_files for update to authenticated
using (
  company_id = public.rbac_user_company_id()
  and (
    uploaded_by = auth.uid()
    or public.rbac_module_can(public.import_file_kind_to_module(kind), 'write')
  )
)
with check (company_id = public.rbac_user_company_id());

drop policy if exists cap_import_file_results_select on public.import_file_results;
create policy cap_import_file_results_select on public.import_file_results for select to authenticated
using (
  exists (
    select 1 from public.import_files f
    where f.id = import_file_id
      and f.company_id = public.rbac_user_company_id()
      and (
        f.uploaded_by = auth.uid()
        or public.rbac_module_can(public.import_file_kind_to_module(f.kind), 'write')
      )
  )
);

drop policy if exists cap_import_file_results_insert on public.import_file_results;
create policy cap_import_file_results_insert on public.import_file_results for insert to authenticated
with check (
  exists (
    select 1 from public.import_files f
    where f.id = import_file_id
      and f.company_id = public.rbac_user_company_id()
      and public.rbac_module_can(public.import_file_kind_to_module(f.kind), 'write')
  )
);

commit;
