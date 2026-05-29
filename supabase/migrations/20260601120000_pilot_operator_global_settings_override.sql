-- OVERRIDE TEMPORANEO PILOT - DA RIMUOVERE IN PRODUZIONE
-- Abilita can_manage_settings per ruolo operatore quando esiste flag in app_settings.
-- Attivazione pilot (una tantum sul DB remoto):
--   insert into public.app_settings (module, key, value, updated_by)
--   values ('system', 'enable_operator_global_settings', '{"enabled": true}'::jsonb, null)
--   on conflict (module, key) do update set value = excluded.value, updated_at = now();
-- Disattivazione: delete from app_settings where module = 'system' and key = 'enable_operator_global_settings';

create or replace function public.rbac_pilot_operator_global_settings_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when jsonb_typeof(s.value) = 'boolean' then (s.value #>> '{}')::boolean
        else coalesce((s.value->>'enabled')::boolean, false)
      end
      from public.app_settings s
      where s.module = 'system'
        and s.key = 'enable_operator_global_settings'
      limit 1
    ),
    false
  );
$$;

revoke all on function public.rbac_pilot_operator_global_settings_enabled() from public;
grant execute on function public.rbac_pilot_operator_global_settings_enabled() to authenticated;

comment on function public.rbac_pilot_operator_global_settings_enabled() is
  'OVERRIDE TEMPORANEO PILOT - DA RIMUOVERE IN PRODUZIONE. Legge app_settings.system.enable_operator_global_settings.';

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
      return v_role in ('manager', 'operatore');
    when 'can_write_operational' then
      return v_role in ('manager', 'operatore');
    when 'can_manage_settings' then
      return v_role = 'manager'
        or (
          v_role = 'operatore'
          and public.rbac_pilot_operator_global_settings_enabled()
        );
    when 'can_manage_security' then
      return false;
    when 'can_access_client_area' then
      return v_role in ('manager', 'operatore', 'cliente');
    else
      return false;
  end case;
end;
$$;
