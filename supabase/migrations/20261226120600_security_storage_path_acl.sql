-- Security remediation v2 (SEC-14): storage path ACL for documenti + pdf-artifacts.

-- ---------------------------------------------------------------------------
-- pdf-artifacts path helper
-- ---------------------------------------------------------------------------
create or replace function public.rbac_storage_pdf_artifacts_entity_allowed(
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  case p_entity_type
    when 'preventivo' then
      return public.rbac_module_can('preventivi', 'read')
        or public.is_preventivo_visible_to_client(p_entity_id);
    when 'ddt' then
      return public.rbac_module_can('preventivi', 'read')
        or public.is_ddt_visible_to_client(p_entity_id);
    when 'fattura' then
      return public.rbac_module_can('fatturazione', 'read');
    else
      return false;
  end case;
end;
$$;

create or replace function public.rbac_storage_pdf_artifacts_path_allowed(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text;
  v_parts text[];
  v_prefix text;
  v_scope text;
  v_entity_id uuid;
  v_art record;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_path := trim(both '/' from coalesce(p_object_name, ''));
  if v_path = '' then
    return false;
  end if;

  select pa.entity_type, pa.entity_id
    into v_art
  from public.pdf_artifacts pa
  where pa.storage_path = v_path
    and pa.status in ('generating', 'ready')
  limit 1;

  if found then
    return public.rbac_storage_pdf_artifacts_entity_allowed(v_art.entity_type, v_art.entity_id);
  end if;

  v_parts := string_to_array(v_path, '/');
  v_prefix := v_parts[1];

  if v_prefix = 'inventory-labels' then
    if v_parts[2] = 'bulk-jobs' then
      return public.rbac_module_can('magazzino', 'read');
    end if;
    begin
      v_entity_id := v_parts[3]::uuid;
    exception when others then
      return false;
    end;
    return public.rbac_module_can('magazzino', 'read');
  end if;

  v_scope := v_parts[2];
  if v_scope is null then
    return false;
  end if;

  case v_prefix
    when 'lavorazioni-in-corso', 'scheda-ingresso', 'scheda-lavorazioni', 'scheda-ricambi' then
      return public.rbac_module_can('lavorazioni', 'read');
    when 'report-bundle' then
      return public.rbac_report_page_read();
    when 'preventivo' then
      begin
        v_entity_id := v_scope::uuid;
      exception when others then
        return false;
      end;
      return public.rbac_module_can('preventivi', 'read')
        or public.is_preventivo_visible_to_client(v_entity_id);
    when 'fattura' then
      return public.rbac_module_can('fatturazione', 'read');
    when 'ddt' then
      begin
        v_entity_id := v_scope::uuid;
      exception when others then
        return false;
      end;
      return public.rbac_module_can('preventivi', 'read')
        or public.is_ddt_visible_to_client(v_entity_id);
    when 'ordine-fornitore' then
      return public.rbac_module_can('ordini_fornitori', 'read');
    when 'dipendenti-aziendale', 'dipendenti-dipendente' then
      return public.rbac_user_page_access_level(public.rbac_auth_uid(), 'dipendenti') in ('read', 'write');
    else
      return false;
  end case;
end;
$$;

revoke all on function public.rbac_storage_pdf_artifacts_entity_allowed(text, uuid) from public;
revoke all on function public.rbac_storage_pdf_artifacts_path_allowed(text) from public;
grant execute on function public.rbac_storage_pdf_artifacts_entity_allowed(text, uuid) to authenticated;
grant execute on function public.rbac_storage_pdf_artifacts_path_allowed(text) to authenticated;

-- ---------------------------------------------------------------------------
-- documenti bucket: SELECT unchanged; UPDATE/DELETE require path binding
-- ---------------------------------------------------------------------------
drop policy if exists cap_storage_documenti_update on storage.objects;
create policy cap_storage_documenti_update on storage.objects
for update to authenticated
using (
  bucket_id = 'documenti'
  and public.rbac_module_can('documenti', 'write')
  and public.rbac_storage_documenti_path_allowed(name)
)
with check (
  bucket_id = 'documenti'
  and public.rbac_module_can('documenti', 'write')
  and public.rbac_storage_documenti_path_allowed(name)
);

drop policy if exists cap_storage_documenti_delete on storage.objects;
create policy cap_storage_documenti_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'documenti'
  and public.rbac_module_can('documenti', 'write')
  and public.rbac_storage_documenti_path_allowed(name)
);

-- Legacy policy names (if still present from older migrations)
drop policy if exists rbac_storage_documenti_update on storage.objects;
drop policy if exists rbac_storage_documenti_delete on storage.objects;

-- ---------------------------------------------------------------------------
-- pdf-artifacts bucket (created in 20260917120100)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from storage.buckets where id = 'pdf-artifacts') then
    execute 'drop policy if exists rbac_storage_pdf_artifacts_select on storage.objects';
    execute $pol$
      create policy rbac_storage_pdf_artifacts_select on storage.objects
      for select to authenticated
      using (
        bucket_id = 'pdf-artifacts'
        and public.rbac_storage_pdf_artifacts_path_allowed(name)
      )
    $pol$;

    execute 'drop policy if exists rbac_storage_pdf_artifacts_insert on storage.objects';
    execute $pol$
      create policy rbac_storage_pdf_artifacts_insert on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'pdf-artifacts'
        and public.rbac_can_write_operational()
      )
    $pol$;

    execute 'drop policy if exists rbac_storage_pdf_artifacts_update on storage.objects';
    execute $pol$
      create policy rbac_storage_pdf_artifacts_update on storage.objects
      for update to authenticated
      using (
        bucket_id = 'pdf-artifacts'
        and public.rbac_can_write_operational()
        and public.rbac_storage_pdf_artifacts_path_allowed(name)
      )
      with check (
        bucket_id = 'pdf-artifacts'
        and public.rbac_can_write_operational()
        and public.rbac_storage_pdf_artifacts_path_allowed(name)
      )
    $pol$;

    execute 'drop policy if exists rbac_storage_pdf_artifacts_delete on storage.objects';
    execute $pol$
      create policy rbac_storage_pdf_artifacts_delete on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'pdf-artifacts'
        and public.rbac_can_write_operational()
        and public.rbac_storage_pdf_artifacts_path_allowed(name)
      )
    $pol$;
  end if;
end $$;

notify pgrst, 'reload schema';
