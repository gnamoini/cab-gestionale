-- RBAC enterprise refactor: policy uniformi + storage semplificato.
-- Core logic: supabase/rbac_core.sql (source of truth — tenere allineato).

-- >>> BEGIN rbac_core (sync con supabase/rbac_core.sql)
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

-- >>> END rbac_core

-- ---------------------------------------------------------------------------
-- Drop policy legacy (idempotente)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'mezzi', 'lavorazioni', 'scheda_lavorazione',
        'magazzino_ricambi', 'movimenti_ricambi', 'preventivi', 'documenti',
        'log_modifiche', 'segnalazioni', 'app_settings', 'app_settings_audit',
        'user_permissions', 'auth_logs'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;

  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (policyname like 'cab\_%' escape '\' or policyname like 'rbac\_storage\_%' escape '\')
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

drop policy if exists cab_images_select on storage.objects;
drop policy if exists cab_images_insert on storage.objects;
drop policy if exists cab_images_update on storage.objects;
drop policy if exists cab_images_delete on storage.objects;
drop policy if exists cab_documenti_select on storage.objects;
drop policy if exists cab_documenti_insert on storage.objects;
drop policy if exists cab_documenti_update on storage.objects;
drop policy if exists cab_documenti_delete on storage.objects;
drop policy if exists rbac_storage_images on storage.objects;
drop policy if exists rbac_storage_documenti on storage.objects;

-- ---------------------------------------------------------------------------
-- Pattern uniforme: SELECT rbac_can_read* | INSERT/UPDATE rbac_can_write | DELETE rbac_is_admin
-- ---------------------------------------------------------------------------

-- profiles
create policy rbac_profiles_select on public.profiles for select to authenticated
using (public.rbac_can_read_row('profiles', id));
create policy rbac_profiles_insert on public.profiles for insert to authenticated
with check (public.rbac_can_write('profiles'));
create policy rbac_profiles_update on public.profiles for update to authenticated
using (public.rbac_can_write('profiles')) with check (public.rbac_can_write('profiles'));
create policy rbac_profiles_delete on public.profiles for delete to authenticated
using (public.rbac_is_admin());

-- mezzi
create policy rbac_mezzi_select on public.mezzi for select to authenticated
using (public.rbac_can_read_row('mezzi', id));
create policy rbac_mezzi_insert on public.mezzi for insert to authenticated
with check (public.rbac_can_write('mezzi'));
create policy rbac_mezzi_update on public.mezzi for update to authenticated
using (public.rbac_can_write('mezzi')) with check (public.rbac_can_write('mezzi'));
create policy rbac_mezzi_delete on public.mezzi for delete to authenticated
using (public.rbac_is_admin());

-- lavorazioni
create policy rbac_lavorazioni_select on public.lavorazioni for select to authenticated
using (public.rbac_can_read_row('lavorazioni', id));
create policy rbac_lavorazioni_insert on public.lavorazioni for insert to authenticated
with check (public.rbac_can_write('lavorazioni'));
create policy rbac_lavorazioni_update on public.lavorazioni for update to authenticated
using (public.rbac_can_write('lavorazioni')) with check (public.rbac_can_write('lavorazioni'));
create policy rbac_lavorazioni_delete on public.lavorazioni for delete to authenticated
using (public.rbac_is_admin());

-- scheda_lavorazione
create policy rbac_scheda_lavorazione_select on public.scheda_lavorazione for select to authenticated
using (public.rbac_can_read_row('scheda_lavorazione', id));
create policy rbac_scheda_lavorazione_insert on public.scheda_lavorazione for insert to authenticated
with check (public.rbac_can_write('scheda_lavorazione'));
create policy rbac_scheda_lavorazione_update on public.scheda_lavorazione for update to authenticated
using (public.rbac_can_write('scheda_lavorazione')) with check (public.rbac_can_write('scheda_lavorazione'));
create policy rbac_scheda_lavorazione_delete on public.scheda_lavorazione for delete to authenticated
using (public.rbac_is_admin());

-- magazzino
create policy rbac_magazzino_ricambi_select on public.magazzino_ricambi for select to authenticated
using (public.rbac_can_read('magazzino'));
create policy rbac_magazzino_ricambi_insert on public.magazzino_ricambi for insert to authenticated
with check (public.rbac_can_write('magazzino'));
create policy rbac_magazzino_ricambi_update on public.magazzino_ricambi for update to authenticated
using (public.rbac_can_write('magazzino')) with check (public.rbac_can_write('magazzino'));
create policy rbac_magazzino_ricambi_delete on public.magazzino_ricambi for delete to authenticated
using (public.rbac_is_admin());

create policy rbac_movimenti_ricambi_select on public.movimenti_ricambi for select to authenticated
using (public.rbac_can_read('movimenti_ricambi'));
create policy rbac_movimenti_ricambi_insert on public.movimenti_ricambi for insert to authenticated
with check (public.rbac_can_write('movimenti_ricambi'));
create policy rbac_movimenti_ricambi_update on public.movimenti_ricambi for update to authenticated
using (public.rbac_can_write('movimenti_ricambi')) with check (public.rbac_can_write('movimenti_ricambi'));
create policy rbac_movimenti_ricambi_delete on public.movimenti_ricambi for delete to authenticated
using (public.rbac_is_admin());

-- preventivi
create policy rbac_preventivi_select on public.preventivi for select to authenticated
using (public.rbac_can_read_row('preventivi', id));
create policy rbac_preventivi_insert on public.preventivi for insert to authenticated
with check (public.rbac_can_write('preventivi'));
create policy rbac_preventivi_update on public.preventivi for update to authenticated
using (public.rbac_can_write('preventivi')) with check (public.rbac_can_write('preventivi'));
create policy rbac_preventivi_delete on public.preventivi for delete to authenticated
using (public.rbac_is_admin());

-- documenti
create policy rbac_documenti_select on public.documenti for select to authenticated
using (public.rbac_can_read_row('documenti', id));
create policy rbac_documenti_insert on public.documenti for insert to authenticated
with check (public.rbac_can_write('documenti'));
create policy rbac_documenti_update on public.documenti for update to authenticated
using (public.rbac_can_write('documenti')) with check (public.rbac_can_write('documenti'));
create policy rbac_documenti_delete on public.documenti for delete to authenticated
using (public.rbac_is_admin());

-- log_modifiche (append-only: no UPDATE policy)
drop policy if exists log_modifiche_update_priv on public.log_modifiche;
drop policy if exists rbac_log_modifiche_update on public.log_modifiche;

create policy rbac_log_modifiche_select on public.log_modifiche for select to authenticated
using (public.rbac_can_read_log(entita, entita_id));
create policy rbac_log_modifiche_insert on public.log_modifiche for insert to authenticated
with check (public.rbac_can_write('log_modifiche'));
create policy rbac_log_modifiche_delete on public.log_modifiche for delete to authenticated
using (public.rbac_is_admin());

-- segnalazioni
create policy rbac_segnalazioni_select on public.segnalazioni for select to authenticated
using (deleted_at is null and public.rbac_can_read('segnalazioni'));
create policy rbac_segnalazioni_insert on public.segnalazioni for insert to authenticated
with check (
  public.rbac_can_write('segnalazioni')
  and created_by = public.rbac_auth_uid()
);
create policy rbac_segnalazioni_update on public.segnalazioni for update to authenticated
using (public.rbac_can_write('segnalazioni')) with check (public.rbac_can_write('segnalazioni'));

-- app_settings
create policy rbac_app_settings_select on public.app_settings for select to authenticated
using (public.rbac_can_read_app_settings(module));
create policy rbac_app_settings_insert on public.app_settings for insert to authenticated
with check (public.rbac_can_write('app_settings'));
create policy rbac_app_settings_update on public.app_settings for update to authenticated
using (public.rbac_can_write('app_settings')) with check (public.rbac_can_write('app_settings'));
create policy rbac_app_settings_delete on public.app_settings for delete to authenticated
using (public.rbac_is_admin());

-- security tables (solo admin)
create policy rbac_user_permissions_admin on public.user_permissions for all to authenticated
using (public.rbac_is_admin()) with check (public.rbac_is_admin());

create policy rbac_auth_logs_select on public.auth_logs for select to authenticated
using (public.rbac_is_admin());

drop policy if exists auth_logs_insert_login on public.auth_logs;
create policy auth_logs_insert_login
on public.auth_logs for insert to authenticated
with check (action = 'login' and user_id = public.rbac_auth_uid());

drop policy if exists auth_logs_insert_logout on public.auth_logs;
create policy auth_logs_insert_logout
on public.auth_logs for insert to authenticated
with check (action = 'logout' and user_id = public.rbac_auth_uid());

drop policy if exists auth_logs_insert_failed_anon on public.auth_logs;
create policy auth_logs_insert_failed_anon
on public.auth_logs for insert to anon
with check (action = 'login_failed' and user_id is null);

drop policy if exists auth_logs_insert_failed_auth on public.auth_logs;
create policy auth_logs_insert_failed_auth
on public.auth_logs for insert to authenticated
with check (action = 'login_failed' and user_id is null);

create policy rbac_app_settings_audit_select on public.app_settings_audit for select to authenticated
using (public.rbac_is_admin());

-- storage (2 policy totali, bucket images + documenti)
create policy rbac_storage_images on storage.objects for all to authenticated
using (bucket_id = 'images' and public.rbac_can_read_storage())
with check (bucket_id = 'images' and public.rbac_can_write_storage());

create policy rbac_storage_documenti on storage.objects for all to authenticated
using (bucket_id = 'documenti' and public.rbac_can_read_storage())
with check (bucket_id = 'documenti' and public.rbac_can_write_storage());

-- Revoke grant UPDATE su log_modifiche non necessario; RLS blocca UPDATE senza policy.

-- Verifica: nessuna policy duplicata per tabella/azione
do $$
declare
  v_dup record;
begin
  for v_dup in
    select schemaname, tablename, cmd, count(*) as n
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'mezzi', 'lavorazioni', 'scheda_lavorazione',
        'magazzino_ricambi', 'movimenti_ricambi', 'preventivi', 'documenti',
        'log_modifiche', 'segnalazioni', 'app_settings'
      )
    group by schemaname, tablename, cmd
    having count(*) > 2
  loop
    raise exception 'Policy duplicate su %.% cmd=% (count=%)',
      v_dup.schemaname, v_dup.tablename, v_dup.cmd, v_dup.n;
  end loop;

  raise notice 'RBAC enterprise refactor OK — policy uniformi attive.';
end $$;
