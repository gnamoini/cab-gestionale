-- Allinea naming helper DB al modulo applicativo `operator-global-settings`.
-- La parte env (NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS) è valutata solo in app;
-- RLS continua a usare il flag `app_settings.system.enable_operator_global_settings`.

create or replace function public.rbac_operator_global_settings_db_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_pilot_operator_global_settings_enabled();
$$;

revoke all on function public.rbac_operator_global_settings_db_enabled() from public;
grant execute on function public.rbac_operator_global_settings_db_enabled() to authenticated;

comment on function public.rbac_operator_global_settings_db_enabled() is
  'Flag DB pilot impostazioni globali operatori. In app richiede anche NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS=1.';

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
          and public.rbac_operator_global_settings_db_enabled()
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
