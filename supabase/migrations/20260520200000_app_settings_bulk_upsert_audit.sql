-- Salvataggio batch impostazioni: audit unico per azione Salva (non una riga per modulo/chiave).

create or replace function public.log_app_settings_update_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('cab.skip_app_settings_row_audit', true), '') = 'on' then
    return new;
  end if;

  insert into public.app_settings_audit (module, key, old_value, new_value, updated_by, updated_at)
  values (
    old.module,
    old.key,
    old.value,
    new.value,
    new.updated_by,
    new.updated_at
  );
  return new;
end;
$$;

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
  if public.current_profile_role() <> 'admin' then
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

revoke all on function public.bulk_upsert_app_settings(jsonb) from public;
grant execute on function public.bulk_upsert_app_settings(jsonb) to authenticated;

comment on function public.bulk_upsert_app_settings(jsonb) is
  'Salvataggio atomico impostazioni (Impostazioni → Salva): N update + 1 riga audit riepilogativa.';
