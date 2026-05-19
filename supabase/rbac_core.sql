-- =============================================================================
-- RBAC CORE — single source of truth (Supabase RLS)
-- Ruoli: admin | operatore | ospite | cliente
-- Mantenere allineato con: supabase/migrations/*_rbac_enterprise_refactor.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Identità sessione (incapsula auth.uid())
-- ---------------------------------------------------------------------------
create or replace function public.rbac_auth_uid()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Ruolo normalizzato (legacy → ruoli ufficiali)
-- ---------------------------------------------------------------------------
create or replace function public.rbac_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case coalesce(public.current_profile_role(), '')
    when 'magazziniere' then 'operatore'
    when 'commerciale' then 'operatore'
    when 'tecnico' then 'operatore'
    when 'sola_lettura' then 'ospite'
    else coalesce(public.current_profile_role(), '')
  end;
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
  select public.rbac_role() in ('admin', 'operatore');
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

-- Alias retrocompatibili
create or replace function public.rbac_normalized_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role();
$$;

create or replace function public.rbac_is_operatore()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role() = 'operatore';
$$;

create or replace function public.rbac_is_ospite()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role() = 'ospite';
$$;

-- ---------------------------------------------------------------------------
-- Matrice permessi per risorsa (senza scope riga)
-- ---------------------------------------------------------------------------
create or replace function public.rbac_resource_allows_read(p_resource text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if public.rbac_auth_uid() is null then
    return false;
  end if;

  v_role := public.rbac_role();
  if v_role = 'admin' then
    return true;
  end if;

  case p_resource
    when 'profiles' then return true;
    when 'lavorazioni', 'mezzi', 'scheda_lavorazione' then
      return v_role in ('operatore', 'ospite', 'cliente');
    when 'magazzino', 'movimenti_ricambi' then
      return v_role in ('operatore', 'ospite');
    when 'preventivi' then
      return v_role in ('operatore', 'ospite', 'cliente');
    when 'documenti' then
      return v_role in ('operatore', 'ospite');
    when 'segnalazioni' then
      return v_role in ('operatore', 'ospite');
    when 'log_modifiche' then
      return v_role in ('operatore', 'cliente');
    when 'app_settings', 'storage' then
      return v_role in ('operatore', 'ospite', 'cliente');
    when 'security' then
      return false;
    else
      return false;
  end case;
end;
$$;

create or replace function public.rbac_resource_allows_write(p_resource text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if public.rbac_auth_uid() is null then
    return false;
  end if;

  v_role := public.rbac_role();
  if v_role = 'admin' then
    return true;
  end if;

  case p_resource
    when 'profiles', 'app_settings', 'security' then
      return false;
    when 'lavorazioni', 'mezzi', 'scheda_lavorazione', 'magazzino', 'movimenti_ricambi',
         'preventivi', 'documenti', 'segnalazioni', 'storage', 'log_modifiche' then
      return v_role = 'operatore';
    else
      return false;
  end case;
end;
$$;

create or replace function public.rbac_resource_allows_delete(p_resource text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_is_admin();
$$;

-- ---------------------------------------------------------------------------
-- Scope dati cliente
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
-- API policy
-- ---------------------------------------------------------------------------
create or replace function public.rbac_can_read(p_resource text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_resource_allows_read(p_resource);
$$;

create or replace function public.rbac_can_read_app_settings(p_module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.profiles pr where pr.id = public.rbac_auth_uid())
    and public.user_effective_can(p_module, 'read');
$$;

create or replace function public.rbac_can_read_row(p_resource text, p_row_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mezzo_id uuid;
begin
  if not public.rbac_resource_allows_read(p_resource) then
    return false;
  end if;

  if p_resource = 'profiles' then
    return public.rbac_is_admin() or p_row_id = public.rbac_auth_uid();
  end if;

  if p_resource = 'documenti' then
    return not public.rbac_is_cliente();
  end if;

  if p_resource = 'lavorazioni' then
    select l.mezzo_id into v_mezzo_id
    from public.lavorazioni l
    where l.id = p_row_id
    limit 1;
    return public.rbac_scope_cliente_lavorazioni_mezzo(v_mezzo_id);
  end if;

  if p_resource in ('mezzi', 'scheda_lavorazione', 'preventivi') then
    return public.rbac_scope_cliente(p_resource, p_row_id);
  end if;

  if public.rbac_is_cliente() then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.rbac_can_read_log(p_entita text, p_entita_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.rbac_is_admin() or public.rbac_role() = 'operatore' then
    return true;
  end if;

  if public.rbac_is_cliente() then
    return public.rbac_scope_log_modifiche(p_entita, p_entita_id);
  end if;

  return false;
end;
$$;

create or replace function public.rbac_can_write(p_resource text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_resource_allows_write(p_resource);
$$;

create or replace function public.rbac_can_delete(p_resource text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_resource_allows_delete(p_resource);
$$;

create or replace function public.rbac_can_read_storage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_can_read('storage');
$$;

create or replace function public.rbac_can_write_storage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_can_write('storage');
$$;

-- Alias retrocompatibili
create or replace function public.rbac_can_read_operational()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role() in ('admin', 'operatore', 'ospite');
$$;

create or replace function public.rbac_can_write_operational()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_is_operatore_or_admin();
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
  select public.rbac_can_read('lavorazioni')
    and public.rbac_scope_cliente_lavorazioni_mezzo(p_mezzo_id);
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
  v_role text;
  r record;
begin
  if public.rbac_auth_uid() is null then
    return false;
  end if;

  v_role := public.rbac_role();
  if v_role = 'admin' then
    return true;
  end if;

  if v_role = 'cliente' then
    return p_op = 'read' and p_module = 'lavorazioni';
  end if;

  select can_read, can_write, can_admin
    into r
  from public.user_permissions up
  where up.user_id = public.rbac_auth_uid()
    and up.module = p_module
  limit 1;

  if found then
    if p_op = 'read' then return r.can_read;
    elsif p_op = 'write' then return r.can_write;
    elsif p_op = 'admin' then return r.can_admin;
    end if;
    return false;
  end if;

  if v_role = 'ospite' then
    return p_op = 'read';
  end if;
  if v_role = 'operatore' then
    return p_op in ('read', 'write');
  end if;
  return false;
end;
$$;

-- Grants
revoke all on function public.rbac_auth_uid() from public;
revoke all on function public.rbac_role() from public;
revoke all on function public.rbac_is_admin() from public;
revoke all on function public.rbac_is_operatore_or_admin() from public;
revoke all on function public.rbac_is_cliente() from public;
revoke all on function public.rbac_cliente_ref() from public;
revoke all on function public.rbac_normalized_role() from public;
revoke all on function public.rbac_is_operatore() from public;
revoke all on function public.rbac_is_ospite() from public;
revoke all on function public.rbac_resource_allows_read(text) from public;
revoke all on function public.rbac_resource_allows_write(text) from public;
revoke all on function public.rbac_resource_allows_delete(text) from public;
revoke all on function public.rbac_scope_cliente(text, uuid) from public;
revoke all on function public.rbac_scope_cliente_lavorazioni_mezzo(uuid) from public;
revoke all on function public.rbac_scope_log_modifiche(text, uuid) from public;
revoke all on function public.rbac_can_read(text) from public;
revoke all on function public.rbac_can_read_app_settings(text) from public;
revoke all on function public.rbac_can_read_row(text, uuid) from public;
revoke all on function public.rbac_can_read_log(text, uuid) from public;
revoke all on function public.rbac_can_write(text) from public;
revoke all on function public.rbac_can_delete(text) from public;
revoke all on function public.rbac_can_read_storage() from public;
revoke all on function public.rbac_can_write_storage() from public;
revoke all on function public.rbac_can_read_operational() from public;
revoke all on function public.rbac_can_write_operational() from public;
revoke all on function public.rbac_mezzo_visible_to_cliente(uuid) from public;
revoke all on function public.rbac_lavorazione_visible_to_cliente(uuid) from public;
revoke all on function public.rbac_can_read_lavorazione_row(uuid) from public;
revoke all on function public.rbac_can_read_log_row(text, uuid) from public;
revoke all on function public.user_effective_can(text, text) from public;

grant execute on function public.rbac_auth_uid() to authenticated;
grant execute on function public.rbac_role() to authenticated;
grant execute on function public.rbac_is_admin() to authenticated;
grant execute on function public.rbac_is_operatore_or_admin() to authenticated;
grant execute on function public.rbac_is_cliente() to authenticated;
grant execute on function public.rbac_cliente_ref() to authenticated;
grant execute on function public.rbac_normalized_role() to authenticated;
grant execute on function public.rbac_is_operatore() to authenticated;
grant execute on function public.rbac_is_ospite() to authenticated;
grant execute on function public.rbac_resource_allows_read(text) to authenticated;
grant execute on function public.rbac_resource_allows_write(text) to authenticated;
grant execute on function public.rbac_resource_allows_delete(text) to authenticated;
grant execute on function public.rbac_scope_cliente(text, uuid) to authenticated;
grant execute on function public.rbac_scope_cliente_lavorazioni_mezzo(uuid) to authenticated;
grant execute on function public.rbac_scope_log_modifiche(text, uuid) to authenticated;
grant execute on function public.rbac_can_read(text) to authenticated;
grant execute on function public.rbac_can_read_app_settings(text) to authenticated;
grant execute on function public.rbac_can_read_row(text, uuid) to authenticated;
grant execute on function public.rbac_can_read_log(text, uuid) to authenticated;
grant execute on function public.rbac_can_write(text) to authenticated;
grant execute on function public.rbac_can_delete(text) to authenticated;
grant execute on function public.rbac_can_read_storage() to authenticated;
grant execute on function public.rbac_can_write_storage() to authenticated;
grant execute on function public.rbac_can_read_operational() to authenticated;
grant execute on function public.rbac_can_write_operational() to authenticated;
grant execute on function public.rbac_mezzo_visible_to_cliente(uuid) to authenticated;
grant execute on function public.rbac_lavorazione_visible_to_cliente(uuid) to authenticated;
grant execute on function public.rbac_can_read_lavorazione_row(uuid) to authenticated;
grant execute on function public.rbac_can_read_log_row(text, uuid) to authenticated;
grant execute on function public.user_effective_can(text, text) to authenticated;
