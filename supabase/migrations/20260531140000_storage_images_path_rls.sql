-- Storage images: SELECT legato a scope/record (mezzi, magazzino, lavorazioni) + permessi modulo.

create or replace function public.rbac_storage_images_path_allowed(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text;
  v_scope text;
  v_record_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_path := trim(both '/' from coalesce(p_object_name, ''));
  if v_path = '' then
    return false;
  end if;

  v_scope := (storage.foldername(p_object_name))[1];
  if v_scope not in ('mezzi', 'magazzino', 'lavorazioni') then
    return false;
  end if;

  begin
    v_record_id := ((storage.foldername(p_object_name))[2])::uuid;
  exception
    when others then
      return false;
  end;

  if v_scope = 'lavorazioni' then
    if public.rbac_is_cliente() then
      return public.rbac_lavorazione_visible_to_cliente(v_record_id);
    end if;
    if not public.user_effective_can('lavorazioni', 'read') then
      return false;
    end if;
    return public.rbac_can_read_row('lavorazioni', v_record_id);
  end if;

  if public.rbac_is_cliente() then
    return false;
  end if;

  if v_scope = 'mezzi' then
    if not public.user_effective_can('mezzi', 'read') then
      return false;
    end if;
    return public.rbac_can_read_row('mezzi', v_record_id);
  end if;

  if v_scope = 'magazzino' then
    if not public.user_effective_can('magazzino', 'read') then
      return false;
    end if;
    return exists (
      select 1 from public.magazzino_ricambi m where m.id = v_record_id
    );
  end if;

  return false;
end;
$$;

drop policy if exists cap_storage_images_select on storage.objects;
drop policy if exists rbac_storage_images_select on storage.objects;

create policy cap_storage_images_select on storage.objects
for select to authenticated
using (
  bucket_id = 'images'
  and public.rbac_storage_images_path_allowed(name)
);

drop policy if exists cap_storage_images_insert on storage.objects;
create policy cap_storage_images_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'images'
  and (
    (
      (storage.foldername(name))[1] = 'mezzi'
      and public.rbac_module_can('mezzi', 'write')
    )
    or (
      (storage.foldername(name))[1] = 'magazzino'
      and public.rbac_module_can('magazzino', 'write')
    )
    or (
      (storage.foldername(name))[1] = 'lavorazioni'
      and public.rbac_module_can('lavorazioni', 'write')
    )
  )
  and coalesce((storage.foldername(name))[2], '') <> ''
);

drop policy if exists cap_storage_images_update on storage.objects;
create policy cap_storage_images_update on storage.objects
for update to authenticated
using (
  bucket_id = 'images'
  and public.rbac_storage_images_path_allowed(name)
)
with check (
  bucket_id = 'images'
  and public.rbac_storage_images_path_allowed(name)
);

drop policy if exists cap_storage_images_delete on storage.objects;
create policy cap_storage_images_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'images'
  and public.rbac_storage_images_path_allowed(name)
);

revoke all on function public.rbac_storage_images_path_allowed(text) from public;
grant execute on function public.rbac_storage_images_path_allowed(text) to authenticated;
