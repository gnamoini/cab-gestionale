-- Storage images: lettura allineata a upload (tutti gli scope) + MIME AVIF.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/jpg', 'image/avif']
)
on conflict (id) do update set
  allowed_mime_types = excluded.allowed_mime_types;

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
    if not (
      public.user_effective_can('lavorazioni', 'read')
      or public.rbac_module_can('lavorazioni', 'write')
    ) then
      return false;
    end if;
    if public.rbac_can_read_row('lavorazioni', v_record_id) then
      return true;
    end if;
    return public.rbac_module_can('lavorazioni', 'write');
  end if;

  if public.rbac_is_cliente() then
    return false;
  end if;

  if v_scope = 'mezzi' then
    if not (
      public.user_effective_can('mezzi', 'read')
      or public.rbac_module_can('mezzi', 'write')
    ) then
      return false;
    end if;
    if public.rbac_can_read_row('mezzi', v_record_id) then
      return true;
    end if;
    return public.rbac_module_can('mezzi', 'write');
  end if;

  if v_scope = 'magazzino' then
    if not (
      public.user_effective_can('magazzino', 'read')
      or public.rbac_module_can('magazzino', 'write')
    ) then
      return false;
    end if;

    if exists (
      select 1 from public.magazzino_ricambi m where m.id = v_record_id
    ) then
      return true;
    end if;

    return public.rbac_module_can('magazzino', 'write');
  end if;

  return false;
end;
$$;

revoke all on function public.rbac_storage_images_path_allowed(text) from public;
grant execute on function public.rbac_storage_images_path_allowed(text) to authenticated;
