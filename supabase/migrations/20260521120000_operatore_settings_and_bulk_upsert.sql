-- Operatore e manager possono gestire app_settings (allineato a lib/rbac.ts).
-- bulk_upsert_app_settings: capability invece del solo ruolo admin.

create or replace function public.rbac_has_capability(p_user_id uuid, p_capability text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if p_user_id is null then
    return false;
  end if;

  v_role := public.rbac_role_for_user(p_user_id);
  if v_role is null or v_role = '' then
    return false;
  end if;

  if v_role = 'admin' then
    return true;
  end if;

  case p_capability
    when 'can_read_operational' then
      return v_role in ('manager', 'operatore', 'guest');
    when 'can_write_operational' then
      return v_role in ('manager', 'operatore');
    when 'can_manage_settings' then
      return v_role in ('manager', 'operatore');
    when 'can_manage_security' then
      return false;
    when 'can_access_client_area' then
      return v_role in ('manager', 'operatore', 'cliente');
    else
      return false;
  end case;
end;
$$;

-- Sostituisce solo il controllo permessi (corpo invariato rispetto a 20260520200000).
create or replace function public.bulk_upsert_app_settings(p_items jsonb)
returns setof public.app_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  v_module text;
  v_key text;
  v_value jsonb;
  v_expected timestamptz;
  v_uid uuid;
  v_cur public.app_settings%rowtype;
  v_row public.app_settings%rowtype;
  v_count int := 0;
begin
  if not public.rbac_has_capability(auth.uid(), 'can_manage_settings') then
    raise exception 'Permesso negato';
  end if;

  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Non autenticato';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items deve essere un array JSON';
  end if;

  perform set_config('cab.skip_app_settings_row_audit', 'on', true);

  for item in select value from jsonb_array_elements(p_items)
  loop
    v_module := nullif(trim(item->>'module'), '');
    v_key := nullif(trim(item->>'key'), '');
    v_value := item->'value';

    if v_module is null or v_key is null then
      raise exception 'module e key obbligatori';
    end if;

    if v_value is null or jsonb_typeof(v_value) <> 'object' then
      raise exception 'value deve essere un oggetto JSON';
    end if;

    if item ? 'expected_updated_at' and item->>'expected_updated_at' is not null and btrim(item->>'expected_updated_at') <> '' then
      v_expected := (item->>'expected_updated_at')::timestamptz;

      update public.app_settings s
      set value = v_value, updated_by = v_uid
      where s.module = v_module and s.key = v_key and s.updated_at = v_expected
      returning s.* into v_row;

      if found then
        v_count := v_count + 1;
        return next v_row;
        continue;
      end if;

      select * into v_cur from public.app_settings s where s.module = v_module and s.key = v_key;

      if not found then
        insert into public.app_settings (module, key, value, updated_by)
        values (v_module, v_key, v_value, v_uid)
        returning * into v_row;
        v_count := v_count + 1;
        return next v_row;
        continue;
      end if;

      if v_cur.updated_at is distinct from v_expected then
        raise exception 'SETTINGS_CONCURRENCY_CONFLICT';
      end if;

      update public.app_settings s
      set value = v_value, updated_by = v_uid
      where s.module = v_module and s.key = v_key
      returning s.* into v_row;

      if not found then
        raise exception 'Aggiornamento impostazioni non riuscito';
      end if;

      v_count := v_count + 1;
      return next v_row;
      continue;
    end if;

    insert into public.app_settings (module, key, value, updated_by)
    values (v_module, v_key, v_value, v_uid)
    on conflict (module, key) do update
      set value = excluded.value, updated_by = excluded.updated_by
    returning * into v_row;

    v_count := v_count + 1;
    return next v_row;
  end loop;

  if v_count > 0 then
    insert into public.app_settings_audit (module, key, old_value, new_value, updated_by, updated_at)
    values (
      'sistema',
      'impostazioni_salvate',
      '{}'::jsonb,
      jsonb_build_object('rows_updated', v_count, 'saved_at', now()),
      v_uid,
      now()
    );
  end if;

  return;
end;
$$;
