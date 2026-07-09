-- Allow uploader to SELECT own pending_upload object during finalize (before finalized_at is set).
-- Restrictive: same tenant, not deleted, only uploader, write permission, pending_upload only.

begin;

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
      and dc.deleted_at is null
      and dc.uploaded_by = v_uid
      and public.rbac_module_can('document_capture', 'write');
  end if;

  if p_op = 'SELECT' then
    if dc.status = 'pending_upload'
      and dc.finalized_at is null
      and dc.deleted_at is null
      and dc.uploaded_by = v_uid
      and public.rbac_module_can('document_capture', 'write') then
      return true;
    end if;

    return dc.finalized_at is not null
      and public.rbac_module_can('document_capture', 'read');
  end if;

  return false;
end;
$$;

grant execute on function public.document_capture_storage_object_allowed(text, text) to authenticated;

commit;
