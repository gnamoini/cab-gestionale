-- =============================================================================
-- RBAC CORE — capability model (single source of truth PostgreSQL)
-- Ruoli: admin | manager | operatore | cliente | guest
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Normalizza ruolo DB → canonico
-- ---------------------------------------------------------------------------
create or replace function public.rbac_normalize_role(p_ruolo text)
returns text
language sql
immutable
as $$
  select case coalesce(p_ruolo, '')
    when 'magazziniere' then 'operatore'
    when 'commerciale' then 'operatore'
    when 'tecnico' then 'operatore'
    when 'sola_lettura' then 'guest'
    when 'ospite' then 'guest'
    when 'viewer' then 'guest'
    else coalesce(p_ruolo, '')
  end;
$$;

create or replace function public.rbac_auth_uid()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

create or replace function public.rbac_role_for_user(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_normalize_role(p.ruolo::text)
  from public.profiles p
  where p.id = p_user_id;
$$;

-- Alias sessione corrente
create or replace function public.rbac_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role_for_user(public.rbac_auth_uid());
$$;

create or replace function public.rbac_normalized_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role();
$$;

-- Compatibilità SQL legacy (policy pre-capability). Preferire rbac_role().
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role();
$$;

-- ---------------------------------------------------------------------------
-- FUNZIONE CENTRALE: rbac_has_capability(user_id, capability)
-- ---------------------------------------------------------------------------
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

-- Wrapper sottili (policy + retrocompatibilità)
create or replace function public.rbac_can_read_operational()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_has_capability(public.rbac_auth_uid(), 'can_read_operational');
$$;

create or replace function public.rbac_can_write_operational()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational');
$$;

create or replace function public.rbac_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role() = 'admin';
$$;

create or replace function public.rbac_is_operatore_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role() in ('admin', 'manager', 'operatore');
$$;

create or replace function public.rbac_is_operatore()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role() in ('manager', 'operatore');
$$;

create or replace function public.rbac_is_cliente()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role() = 'cliente';
$$;

create or replace function public.rbac_is_ospite()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role() = 'guest';
$$;

create or replace function public.rbac_cliente_ref()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(p.cliente_ref), '')
  from public.profiles p
  where p.id = public.rbac_auth_uid();
$$;

-- ---------------------------------------------------------------------------
-- Scope cliente (isolamento multi-tenant — unica logica row-level)
-- ---------------------------------------------------------------------------
create or replace function public.rbac_scope_cliente(p_table text, p_record_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ref text;
begin
  if not public.rbac_is_cliente() then
    return true;
  end if;

  v_ref := public.rbac_cliente_ref();
  if v_ref is null or p_record_id is null then
    return false;
  end if;

  case p_table
    when 'mezzi' then
      return exists (
        select 1 from public.mezzi m
        where m.id = p_record_id and m.cliente = v_ref
      );
    when 'lavorazioni' then
      return exists (
        select 1
        from public.lavorazioni l
        join public.mezzi m on m.id = l.mezzo_id
        where l.id = p_record_id and m.cliente = v_ref
      );
    when 'scheda_lavorazione' then
      return exists (
        select 1
        from public.scheda_lavorazione s
        join public.lavorazioni l on l.id = s.lavorazione_id
        join public.mezzi m on m.id = l.mezzo_id
        where s.id = p_record_id and m.cliente = v_ref
      );
    when 'preventivi' then
      return exists (
        select 1 from public.preventivi p
        where p.id = p_record_id and p.cliente = v_ref
      );
    else
      return false;
  end case;
end;
$$;

create or replace function public.rbac_scope_cliente_lavorazioni_mezzo(p_mezzo_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ref text;
begin
  if not public.rbac_is_cliente() then
    return true;
  end if;

  v_ref := public.rbac_cliente_ref();
  if v_ref is null or p_mezzo_id is null then
    return false;
  end if;

  return exists (
    select 1 from public.mezzi m
    where m.id = p_mezzo_id and m.cliente = v_ref
  );
end;
$$;

create or replace function public.rbac_scope_log_modifiche(p_entita text, p_entita_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.rbac_is_cliente() then
    return true;
  end if;

  if p_entita is distinct from 'lavorazioni' then
    return false;
  end if;

  return public.rbac_scope_cliente('lavorazioni', p_entita_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Lettura riga operativa (capability + scope cliente)
-- ---------------------------------------------------------------------------
create or replace function public.rbac_can_read_row(p_resource text, p_row_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mezzo_id uuid;
  v_uid uuid;
begin
  v_uid := public.rbac_auth_uid();

  if p_resource = 'profiles' then
    return public.rbac_has_capability(v_uid, 'can_manage_security')
      or p_row_id = v_uid;
  end if;

  if public.rbac_has_capability(v_uid, 'can_read_operational') then
    if p_resource = 'documenti' and public.rbac_is_cliente() then
      return false;
    end if;

    if p_resource = 'lavorazioni' then
      select l.mezzo_id into v_mezzo_id from public.lavorazioni l where l.id = p_row_id limit 1;
      return public.rbac_scope_cliente_lavorazioni_mezzo(v_mezzo_id);
    end if;

    if p_resource in ('mezzi', 'scheda_lavorazione', 'preventivi') then
      return public.rbac_scope_cliente(p_resource, p_row_id);
    end if;

    if public.rbac_is_cliente() then
      return false;
    end if;

    return true;
  end if;

  if public.rbac_has_capability(v_uid, 'can_access_client_area') and public.rbac_is_cliente() then
    if p_resource = 'lavorazioni' then
      return public.rbac_scope_cliente('lavorazioni', p_row_id);
    end if;
    if p_resource = 'mezzi' then
      return public.rbac_scope_cliente('mezzi', p_row_id);
    end if;
    if p_resource = 'scheda_lavorazione' then
      return public.rbac_scope_cliente('scheda_lavorazione', p_row_id);
    end if;
    if p_resource = 'preventivi' then
      return public.rbac_scope_cliente('preventivi', p_row_id);
    end if;
  end if;

  return false;
end;
$$;

create or replace function public.rbac_can_read_log(p_entita text, p_entita_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
begin
  if public.rbac_has_capability(v_uid, 'can_read_operational')
    and not public.rbac_is_cliente() then
    return true;
  end if;

  if public.rbac_has_capability(v_uid, 'can_access_client_area') and public.rbac_is_cliente() then
    return public.rbac_scope_log_modifiche(p_entita, p_entita_id);
  end if;

  return false;
end;
$$;

-- app_settings: read modulare (cliente → solo lavorazioni)
create or replace function public.rbac_can_read_app_settings(p_module text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
begin
  if not exists (select 1 from public.profiles pr where pr.id = v_uid) then
    return false;
  end if;

  if public.rbac_has_capability(v_uid, 'can_manage_settings') then
    return true;
  end if;

  if public.rbac_is_cliente() then
    return p_module = 'lavorazioni';
  end if;

  if public.rbac_has_capability(v_uid, 'can_read_operational') then
    return true;
  end if;

  return false;
end;
$$;

-- Retrocompatibilità API resource-based (delegano a capability)
create or replace function public.rbac_can_read(p_resource text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_can_read_operational();
$$;

create or replace function public.rbac_can_write(p_resource text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_resource
    when 'profiles' then public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
    when 'app_settings' then public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings')
    when 'log_modifiche' then public.rbac_can_write_operational()
    else public.rbac_can_write_operational()
  end;
$$;

create or replace function public.rbac_can_delete(p_resource text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_resource
    when 'log_modifiche' then public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
    else public.rbac_can_write_operational()
  end;
$$;

create or replace function public.rbac_can_read_storage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_can_read_operational();
$$;

create or replace function public.rbac_can_write_storage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_can_write_operational();
$$;

create or replace function public.rbac_mezzo_visible_to_cliente(p_mezzo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_scope_cliente_lavorazioni_mezzo(p_mezzo_id);
$$;

create or replace function public.rbac_lavorazione_visible_to_cliente(p_lavorazione_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_scope_cliente('lavorazioni', p_lavorazione_id);
$$;

create or replace function public.rbac_can_read_lavorazione_row(p_mezzo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_can_read_row('mezzi', p_mezzo_id);
$$;

create or replace function public.rbac_can_read_log_row(p_entita text, p_entita_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_can_read_log(p_entita, p_entita_id);
$$;

create or replace function public.user_effective_can(p_module text, p_op text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
begin
  if v_uid is null then
    return false;
  end if;

  if public.rbac_has_capability(v_uid, 'can_manage_settings') then
    return true;
  end if;

  if public.rbac_is_cliente() then
    return p_op = 'read' and p_module = 'lavorazioni';
  end if;

  if public.rbac_has_capability(v_uid, 'can_read_operational') and p_op = 'read' then
    return true;
  end if;

  if public.rbac_has_capability(v_uid, 'can_write_operational') and p_op in ('read', 'write') then
    return true;
  end if;

  return false;
end;
$$;

-- Grants
revoke all on function public.rbac_normalize_role(text) from public;
revoke all on function public.rbac_auth_uid() from public;
revoke all on function public.rbac_role_for_user(uuid) from public;
revoke all on function public.rbac_role() from public;
revoke all on function public.rbac_normalized_role() from public;
revoke all on function public.rbac_has_capability(uuid, text) from public;
revoke all on function public.rbac_can_read_operational() from public;
revoke all on function public.rbac_can_write_operational() from public;
revoke all on function public.rbac_is_admin() from public;
revoke all on function public.rbac_is_operatore_or_admin() from public;
revoke all on function public.rbac_is_operatore() from public;
revoke all on function public.rbac_is_cliente() from public;
revoke all on function public.rbac_is_ospite() from public;
revoke all on function public.rbac_cliente_ref() from public;
revoke all on function public.rbac_scope_cliente(text, uuid) from public;
revoke all on function public.rbac_scope_cliente_lavorazioni_mezzo(uuid) from public;
revoke all on function public.rbac_scope_log_modifiche(text, uuid) from public;
revoke all on function public.rbac_can_read_row(text, uuid) from public;
revoke all on function public.rbac_can_read_log(text, uuid) from public;
revoke all on function public.rbac_can_read_app_settings(text) from public;
revoke all on function public.rbac_can_read(text) from public;
revoke all on function public.rbac_can_write(text) from public;
revoke all on function public.rbac_can_delete(text) from public;
revoke all on function public.rbac_can_read_storage() from public;
revoke all on function public.rbac_can_write_storage() from public;
revoke all on function public.rbac_mezzo_visible_to_cliente(uuid) from public;
revoke all on function public.rbac_lavorazione_visible_to_cliente(uuid) from public;
revoke all on function public.rbac_can_read_lavorazione_row(uuid) from public;
revoke all on function public.rbac_can_read_log_row(text, uuid) from public;
revoke all on function public.user_effective_can(text, text) from public;

grant execute on function public.rbac_normalize_role(text) to authenticated;
grant execute on function public.rbac_auth_uid() to authenticated;
grant execute on function public.rbac_role_for_user(uuid) to authenticated;
grant execute on function public.rbac_role() to authenticated;
grant execute on function public.rbac_normalized_role() to authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.rbac_has_capability(uuid, text) to authenticated;
grant execute on function public.rbac_can_read_operational() to authenticated;
grant execute on function public.rbac_can_write_operational() to authenticated;
grant execute on function public.rbac_is_admin() to authenticated;
grant execute on function public.rbac_is_operatore_or_admin() to authenticated;
grant execute on function public.rbac_is_operatore() to authenticated;
grant execute on function public.rbac_is_cliente() to authenticated;
grant execute on function public.rbac_is_ospite() to authenticated;
grant execute on function public.rbac_cliente_ref() to authenticated;
grant execute on function public.rbac_scope_cliente(text, uuid) to authenticated;
grant execute on function public.rbac_scope_cliente_lavorazioni_mezzo(uuid) to authenticated;
grant execute on function public.rbac_scope_log_modifiche(text, uuid) to authenticated;
grant execute on function public.rbac_can_read_row(text, uuid) to authenticated;
grant execute on function public.rbac_can_read_log(text, uuid) to authenticated;
grant execute on function public.rbac_can_read_app_settings(text) to authenticated;
grant execute on function public.rbac_can_read(text) to authenticated;
grant execute on function public.rbac_can_write(text) to authenticated;
grant execute on function public.rbac_can_delete(text) to authenticated;
grant execute on function public.rbac_can_read_storage() to authenticated;
grant execute on function public.rbac_can_write_storage() to authenticated;
grant execute on function public.rbac_mezzo_visible_to_cliente(uuid) to authenticated;
grant execute on function public.rbac_lavorazione_visible_to_cliente(uuid) to authenticated;
grant execute on function public.rbac_can_read_lavorazione_row(uuid) to authenticated;
grant execute on function public.rbac_can_read_log_row(text, uuid) to authenticated;
grant execute on function public.user_effective_can(text, text) to authenticated;
