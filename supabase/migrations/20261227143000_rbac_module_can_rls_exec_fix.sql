-- Fix RLS UPDATE/INSERT: rbac_module_can era LANGUAGE sql SECURITY DEFINER.
-- In policy RLS PostgREST può propagare 42501 quando user_effective_can chiama
-- rbac_module_from_page_access → rbac_user_page_access_level (SERVER_ONLY).
-- plpgsql DEFINER + rbac_auth_uid() allinea al pattern report_rls_exec_fix.

create or replace function public.rbac_module_can(p_module text, p_op text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.user_effective_can(p_module, p_op);
end;
$$;

create or replace function public.user_effective_can(p_module text, p_op text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_role_key text;
begin
  v_uid := public.rbac_auth_uid();
  if v_uid is null then
    return false;
  end if;

  v_role_key := lower(trim(public.rbac_role_for_user(v_uid)));
  if v_role_key = 'admin' then
    return true;
  end if;

  if v_role_key = 'cliente' then
    return p_op = 'read'
      and coalesce(p_module, '') = 'lavorazioni'
      and public.rbac_user_page_access_level(v_uid, 'lavorazioni_clienti') in ('read', 'write');
  end if;

  if not public.rbac_is_valid_erp_module(p_module) then
    return false;
  end if;

  return public.rbac_module_from_page_access(v_uid, p_module, p_op);
end;
$$;

create or replace function public.rbac_module_from_page_access(p_user_id uuid, p_module text, p_op text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_page record;
  v_level text;
  v_role_key text;
begin
  if p_user_id is null or p_module is null or p_module = '' then
    return false;
  end if;

  v_role_key := lower(trim(public.rbac_role_for_user(p_user_id)));
  if v_role_key = 'admin' then
    return true;
  end if;

  for v_page in
    select distinct e.page_key
    from public.rbac_page_module_expansion e
    where e.module = p_module
  loop
    v_level := public.rbac_user_page_access_level(p_user_id, v_page.page_key);
    if v_level = 'none' then
      continue;
    end if;
    if p_op = 'read' and v_level in ('read', 'write') then
      return true;
    end if;
    if p_op = 'write' and v_level = 'write' then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

revoke all on function public.rbac_module_can(text, text) from public, anon, authenticated, service_role;
grant execute on function public.rbac_module_can(text, text) to authenticated;
grant execute on function public.rbac_module_can(text, text) to service_role;

comment on function public.rbac_module_can(text, text) is
  'RLS module gate — plpgsql DEFINER (fix 42501 da nested SERVER_ONLY in policy).';

notify pgrst, 'reload schema';
