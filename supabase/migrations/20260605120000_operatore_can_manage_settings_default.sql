-- Operatore: gestione impostazioni globali abilitata di default (allineato a lib/rbac.ts).
-- Rimuove il gate pilot su can_manage_settings; il flag system resta per audit/compat.

insert into public.app_settings (module, key, value, updated_by)
values ('system', 'enable_operator_global_settings', '{"enabled": true}'::jsonb, null)
on conflict (module, key) do update
  set value = excluded.value,
      updated_at = now();

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
