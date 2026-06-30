-- Role switch: RPC + guard trigger + user_effective_can admin op hardening.

create or replace function public.security_set_user_role(
  p_user_id uuid,
  p_new_role public.ruolo_utente
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'security_set_user_role: user_id required';
  end if;

  perform set_config('app.security_set_user_role', '1', true);
  -- transaction-local execution marker for trg_profiles_ruolo_guard only; not authorization

  delete from public.user_permissions where user_id = p_user_id;
  update public.profiles set ruolo = p_new_role where id = p_user_id;

  if not found then
    raise exception 'security_set_user_role: profile not found %', p_user_id;
  end if;
end;
$$;

revoke all on function public.security_set_user_role(uuid, public.ruolo_utente) from public;
grant execute on function public.security_set_user_role(uuid, public.ruolo_utente) to service_role;

create or replace function public.trg_profiles_ruolo_guard()
returns trigger
language plpgsql
as $$
begin
  if old.ruolo is distinct from new.ruolo then
    if coalesce(current_setting('app.security_set_user_role', true), '') <> '1' then
      raise exception 'profiles.ruolo is immutable except via RPC';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_ruolo_guard on public.profiles;
create trigger trg_profiles_ruolo_guard
  before update of ruolo on public.profiles
  for each row execute function public.trg_profiles_ruolo_guard();

create or replace function public.user_effective_can(p_module text, p_op text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  r record;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_role := public.rbac_normalized_role();

  if v_role = 'admin' then
    if p_op = 'read' then
      return true;
    elsif p_op = 'write' then
      return true;
    elsif p_op = 'admin' then
      return true;
    end if;
    return false;
  end if;

  if p_op = 'admin' then
    return false;
  end if;

  if v_role = 'cliente' then
    return p_op = 'read' and coalesce(p_module, '') = 'lavorazioni';
  end if;

  if not public.rbac_is_valid_erp_module(p_module) then
    return false;
  end if;

  select up.can_read, up.can_write
    into r
  from public.user_permissions up
  where up.user_id = auth.uid()
    and up.module = p_module
  limit 1;

  if found then
    if p_op = 'read' then
      return r.can_read;
    elsif p_op = 'write' then
      return r.can_write;
    end if;
    return false;
  end if;

  return public.rbac_role_module_default(v_role, p_module, p_op);
end;
$$;
