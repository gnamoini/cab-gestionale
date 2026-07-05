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
      $cron$select public.expire_pending_document_captures();$cron$
    );
  end if;
exception when others then
  null;
end;
$$;