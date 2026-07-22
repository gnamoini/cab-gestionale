-- RBAC v3.1: addetto_amministrativo, ROLE_MODULE_DEFAULTS SQL mirror, bunder hard gate, precedence.

alter type public.ruolo_utente add value if not exists 'addetto_amministrativo';

-- Normalizza ruolo (commerciale → addetto_amministrativo)
create or replace function public.rbac_normalize_role(p_ruolo text)
returns text
language sql
immutable
as $$
  select case coalesce(p_ruolo, '')
    when 'magazziniere' then 'operatore'
    when 'tecnico' then 'operatore'
    when 'commerciale' then 'addetto_amministrativo'
    when 'sola_lettura' then 'guest'
    when 'ospite' then 'guest'
    when 'viewer' then 'guest'
    else coalesce(p_ruolo, '')
  end;
$$;

/*
 * RBAC_PRECEDENCE — ordine di valutazione permessi (identico TS e SQL)
 * 0. CLIENTE SANDBOX (middleware only)
 * 1. HARD CAPABILITY / ROLE GATE
 * 2. user_permissions override
 * 3. ROLE MODULE FALLBACK (rbac_role_module_default)
 * 4. DEFAULT DENY
 */

create or replace function public.rbac_is_valid_erp_module(p_module text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_module, '') in (
    'magazzino', 'preventivi', 'lavorazioni', 'mezzi', 'report',
    'documenti', 'dipendenti', 'fatturazione', 'ddt'
  );
$$;

create or replace function public.rbac_role_module_default(p_role text, p_module text, p_op text)
returns boolean
language plpgsql
immutable
as $$
begin
  if not public.rbac_is_valid_erp_module(p_module) then
    return false;
  end if;

  if p_role = 'admin' then
    return true;
  end if;

  if p_role = 'cliente' then
    return false;
  end if;

  -- guest: audit interno — read ALL modules, write NEVER
  if p_role = 'guest' then
    return p_op = 'read';
  end if;

  -- operatore: officina
  if p_role = 'operatore' then
    if p_module in ('magazzino', 'lavorazioni', 'mezzi', 'documenti') then
      return p_op in ('read', 'write');
    end if;
    return false;
  end if;

  -- addetto_amministrativo: preventivi / amministrativo
  if p_role = 'addetto_amministrativo' then
    if p_module in ('preventivi', 'fatturazione', 'ddt', 'report') then
      return p_op in ('read', 'write');
    end if;
    return false;
  end if;

  -- manager: full operational
  if p_role = 'manager' then
    return p_op in ('read', 'write');
  end if;

  return false;
end;
$$;

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
      return v_role in ('manager', 'operatore', 'addetto_amministrativo', 'guest');
    when 'can_write_operational' then
      return v_role in ('manager', 'operatore', 'addetto_amministrativo');
    when 'can_manage_settings' then
      return v_role = 'manager';
    when 'can_manage_security' then
      return false;
    when 'can_access_client_area' then
      return v_role in ('admin', 'cliente');
    else
      return false;
  end case;
end;
$$;

create or replace function public.rbac_bunder_can(p_op text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := public.rbac_normalized_role();
  if v_role is null or v_role = '' then
    return false;
  end if;

  if p_op = 'read' then
    return v_role in ('admin', 'manager', 'guest');
  end if;

  if p_op in ('write', 'delete') then
    return v_role in ('admin', 'manager');
  end if;

  return false;
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
  v_role text;
  r record;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_role := public.rbac_normalized_role();

  -- Step 1 partial: admin bypass
  if v_role = 'admin' then
    return true;
  end if;

  -- cliente: solo lavorazioni read (portale)
  if v_role = 'cliente' then
    return p_op = 'read' and coalesce(p_module, '') = 'lavorazioni';
  end if;

  if not public.rbac_is_valid_erp_module(p_module) then
    return false;
  end if;

  -- Step 2: user_permissions override
  select up.can_read, up.can_write, up.can_admin
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
    elsif p_op = 'admin' then
      return r.can_admin;
    end if;
    return false;
  end if;

  -- Step 3: role module fallback
  return public.rbac_role_module_default(v_role, p_module, p_op);
end;
$$;

-- BUNDER: hard gate — skip se modulo rimosso (20260901140000_drop_bunder_module)
DO $policy$
BEGIN
  IF to_regclass('public.bunder_documents') IS NOT NULL THEN
    EXECUTE $sql$
      drop policy if exists bunder_documents_select on public.bunder_documents;
      create policy bunder_documents_select on public.bunder_documents
        for select to authenticated
        using (public.rbac_bunder_can('read'));

      drop policy if exists bunder_documents_insert on public.bunder_documents;
      create policy bunder_documents_insert on public.bunder_documents
        for insert to authenticated
        with check (public.rbac_bunder_can('write'));

      drop policy if exists bunder_documents_update on public.bunder_documents;
      create policy bunder_documents_update on public.bunder_documents
        for update to authenticated
        using (public.rbac_bunder_can('write'))
        with check (public.rbac_bunder_can('write'));

      drop policy if exists bunder_documents_delete on public.bunder_documents;
      create policy bunder_documents_delete on public.bunder_documents
        for delete to authenticated
        using (public.rbac_bunder_can('write'));
    $sql$;
  END IF;
END
$policy$;

-- handle_new_user: ruoli canonici v3.1
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_app_nome text;
  v_app_ruolo text;
  v_app_username text;
  v_username text;
  v_ruolo public.ruolo_utente := 'operatore'::public.ruolo_utente;
  v_base text;
  v_candidate text;
  v_n int;
begin
  v_app_nome := nullif(trim(coalesce(new.raw_app_meta_data->>'cab_nome', '')), '');
  v_nome := coalesce(v_app_nome, nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''), 'utente');

  v_app_ruolo := lower(nullif(trim(coalesce(new.raw_app_meta_data->>'cab_ruolo', '')), ''));
  if v_app_ruolo = 'commerciale' then
    v_ruolo := 'addetto_amministrativo'::public.ruolo_utente;
  elsif v_app_ruolo in ('tecnico', 'magazziniere') then
    v_ruolo := 'operatore'::public.ruolo_utente;
  elsif v_app_ruolo in ('viewer', 'sola_lettura', 'ospite') then
    v_ruolo := 'guest'::public.ruolo_utente;
  elsif v_app_ruolo in (
    'admin', 'manager', 'operatore', 'addetto_amministrativo', 'cliente', 'guest'
  ) then
    v_ruolo := v_app_ruolo::public.ruolo_utente;
  end if;

  v_app_username := lower(trim(coalesce(new.raw_app_meta_data->>'cab_username', '')));
  if v_app_username <> '' and v_app_username ~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$' and char_length(v_app_username) between 3 and 32 then
    v_username := v_app_username;
  else
    v_base := regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9._-]', '', 'g');
    v_base := trim(both '._-' from v_base);
    if v_base is null or char_length(v_base) < 3 then
      v_base := 'utente';
    end if;
    if char_length(v_base) > 32 then
      v_base := left(v_base, 32);
    end if;
    v_candidate := v_base;
    v_n := 1;
    while exists (
      select 1 from public.profiles p2 where lower(p2.username) = lower(v_candidate)
    ) loop
      v_n := v_n + 1;
      v_candidate := left(v_base, greatest(3, 32 - char_length(v_n::text) - 1)) || v_n::text;
    end loop;
    v_username := v_candidate;
  end if;

  insert into public.profiles (id, nome, ruolo, username)
  values (new.id, v_nome, v_ruolo, v_username)
  on conflict (id) do update
    set nome = excluded.nome,
        ruolo = excluded.ruolo,
        username = coalesce(public.profiles.username, excluded.username);

  return new;
end;
$$;

revoke all on function public.rbac_is_valid_erp_module(text) from public;
revoke all on function public.rbac_role_module_default(text, text, text) from public;
revoke all on function public.rbac_bunder_can(text) from public;
grant execute on function public.rbac_is_valid_erp_module(text) to authenticated;
grant execute on function public.rbac_role_module_default(text, text, text) to authenticated;
grant execute on function public.rbac_bunder_can(text) to authenticated;
