-- RLS: enforcement user_permissions, storage documenti per-path, hardening capability.

-- ---------------------------------------------------------------------------
-- 1. user_effective_can — legge user_permissions + fallback ruolo
-- ---------------------------------------------------------------------------
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
    return true;
  end if;

  if v_role = 'cliente' then
    return p_op = 'read' and coalesce(p_module, '') = 'lavorazioni';
  end if;

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

  if v_role in ('guest', 'ospite', 'sola_lettura') then
    return p_op = 'read';
  end if;

  if v_role in ('manager', 'operatore', 'magazziniere', 'commerciale', 'tecnico') then
    return p_op in ('read', 'write');
  end if;

  return false;
end;
$$;

create or replace function public.rbac_module_can(p_module text, p_op text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_effective_can(p_module, p_op);
$$;

create or replace function public.rbac_resource_to_module(p_resource text)
returns text
language sql
immutable
as $$
  select case coalesce(p_resource, '')
    when 'mezzi' then 'mezzi'
    when 'lavorazioni' then 'lavorazioni'
    when 'scheda_lavorazione' then 'lavorazioni'
    when 'magazzino' then 'magazzino'
    when 'movimenti_ricambi' then 'magazzino'
    when 'documenti' then 'documenti'
    when 'preventivi' then 'preventivi'
    when 'report' then 'report'
    else null
  end;
$$;

create or replace function public.rbac_resource_module_can(p_resource text, p_op text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_module text;
begin
  v_module := public.rbac_resource_to_module(p_resource);
  if v_module is null then
    return false;
  end if;
  return public.user_effective_can(v_module, p_op);
end;
$$;

create or replace function public.rbac_log_entita_module(p_entita text)
returns text
language sql
immutable
as $$
  select case coalesce(p_entita, '')
    when 'mezzi' then 'mezzi'
    when 'lavorazioni' then 'lavorazioni'
    when 'magazzino' then 'magazzino'
    when 'magazzino_ricambi' then 'magazzino'
    when 'preventivi' then 'preventivi'
    when 'documenti' then 'documenti'
    else null
  end;
$$;

create or replace function public.rbac_staff_has_any_module_read()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_effective_can('magazzino', 'read')
    or public.user_effective_can('preventivi', 'read')
    or public.user_effective_can('lavorazioni', 'read')
    or public.user_effective_can('mezzi', 'read')
    or public.user_effective_can('report', 'read')
    or public.user_effective_can('documenti', 'read');
$$;

-- ---------------------------------------------------------------------------
-- 2. rbac_has_capability — settings solo admin/manager; guest fuori read operativo
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
      return v_role = 'manager';
    when 'can_manage_security' then
      return false;
    when 'can_access_client_area' then
      return v_role in ('manager', 'operatore', 'cliente');
    else
      return false;
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Lettura/scrittura riga e log (modulo + scope cliente)
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
  v_module text;
begin
  v_uid := public.rbac_auth_uid();

  if p_resource = 'profiles' then
    return public.rbac_has_capability(v_uid, 'can_manage_security')
      or p_row_id = v_uid;
  end if;

  v_module := public.rbac_resource_to_module(p_resource);

  if public.rbac_has_capability(v_uid, 'can_read_operational') then
    if p_resource = 'documenti' and public.rbac_is_cliente() then
      return false;
    end if;

    if v_module is not null and not public.user_effective_can(v_module, 'read') then
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
  v_module text;
begin
  v_module := public.rbac_log_entita_module(p_entita);

  if public.rbac_has_capability(v_uid, 'can_read_operational')
    and not public.rbac_is_cliente() then
    if v_module is not null and not public.user_effective_can(v_module, 'read') then
      return false;
    end if;
    return true;
  end if;

  if public.rbac_has_capability(v_uid, 'can_access_client_area') and public.rbac_is_cliente() then
    return public.rbac_scope_log_modifiche(p_entita, p_entita_id);
  end if;

  return false;
end;
$$;

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

  if p_module = 'user_prefs' then
    return false;
  end if;

  if public.rbac_has_capability(v_uid, 'can_manage_settings') then
    return true;
  end if;

  if public.rbac_is_cliente() then
    return p_module = 'lavorazioni';
  end if;

  return public.user_effective_can(p_module, 'read');
end;
$$;

create or replace function public.rbac_can_write(p_resource text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return case p_resource
    when 'profiles' then public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
    when 'app_settings' then public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings')
    when 'log_modifiche' then
      public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
    else public.rbac_resource_module_can(p_resource, 'write')
  end;
end;
$$;

create or replace function public.rbac_can_delete(p_resource text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return case p_resource
    when 'log_modifiche' then public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
    when 'mezzi' then public.user_effective_can('mezzi', 'admin')
    else public.rbac_resource_module_can(p_resource, 'write')
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. user_permissions — lettura proprie righe + admin security
-- ---------------------------------------------------------------------------
drop policy if exists cap_user_permissions on public.user_permissions;
drop policy if exists user_permissions_select_admin on public.user_permissions;
drop policy if exists user_permissions_write_admin on public.user_permissions;

create policy cap_user_permissions_select on public.user_permissions
for select to authenticated
using (
  user_id = auth.uid()
  or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
);

create policy cap_user_permissions_write on public.user_permissions
for all to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

-- ---------------------------------------------------------------------------
-- 5. Policy operative — modulo user_permissions
-- ---------------------------------------------------------------------------
drop policy if exists cap_magazzino_select on public.magazzino_ricambi;
create policy cap_magazzino_select on public.magazzino_ricambi for select to authenticated
using (public.rbac_module_can('magazzino', 'read'));

drop policy if exists cap_magazzino_insert on public.magazzino_ricambi;
create policy cap_magazzino_insert on public.magazzino_ricambi for insert to authenticated
with check (public.rbac_module_can('magazzino', 'write'));

drop policy if exists cap_magazzino_update on public.magazzino_ricambi;
create policy cap_magazzino_update on public.magazzino_ricambi for update to authenticated
using (public.rbac_module_can('magazzino', 'write'))
with check (public.rbac_module_can('magazzino', 'write'));

drop policy if exists cap_magazzino_delete on public.magazzino_ricambi;
create policy cap_magazzino_delete on public.magazzino_ricambi for delete to authenticated
using (public.rbac_module_can('magazzino', 'write'));

drop policy if exists cap_movimenti_select on public.movimenti_ricambi;
create policy cap_movimenti_select on public.movimenti_ricambi for select to authenticated
using (public.rbac_module_can('magazzino', 'read'));

drop policy if exists cap_movimenti_insert on public.movimenti_ricambi;
create policy cap_movimenti_insert on public.movimenti_ricambi for insert to authenticated
with check (public.rbac_module_can('magazzino', 'write'));

drop policy if exists cap_movimenti_update on public.movimenti_ricambi;
create policy cap_movimenti_update on public.movimenti_ricambi for update to authenticated
using (public.rbac_module_can('magazzino', 'write'))
with check (public.rbac_module_can('magazzino', 'write'));

drop policy if exists cap_movimenti_delete on public.movimenti_ricambi;
create policy cap_movimenti_delete on public.movimenti_ricambi for delete to authenticated
using (public.rbac_module_can('magazzino', 'write'));

drop policy if exists cap_mezzi_insert on public.mezzi;
create policy cap_mezzi_insert on public.mezzi for insert to authenticated
with check (public.rbac_module_can('mezzi', 'write'));

drop policy if exists cap_mezzi_update on public.mezzi;
create policy cap_mezzi_update on public.mezzi for update to authenticated
using (public.rbac_module_can('mezzi', 'write'))
with check (public.rbac_module_can('mezzi', 'write'));

drop policy if exists cap_mezzi_delete on public.mezzi;
create policy cap_mezzi_delete on public.mezzi for delete to authenticated
using (public.rbac_module_can('mezzi', 'admin'));

drop policy if exists cap_lavorazioni_insert on public.lavorazioni;
create policy cap_lavorazioni_insert on public.lavorazioni for insert to authenticated
with check (public.rbac_module_can('lavorazioni', 'write'));

drop policy if exists cap_lavorazioni_update on public.lavorazioni;
create policy cap_lavorazioni_update on public.lavorazioni for update to authenticated
using (
  public.rbac_module_can('lavorazioni', 'write')
  and deleted_at is null
)
with check (public.rbac_module_can('lavorazioni', 'write'));

drop policy if exists cap_lavorazioni_delete on public.lavorazioni;
create policy cap_lavorazioni_delete on public.lavorazioni for delete to authenticated
using (public.rbac_module_can('lavorazioni', 'write'));

drop policy if exists cap_scheda_insert on public.scheda_lavorazione;
create policy cap_scheda_insert on public.scheda_lavorazione for insert to authenticated
with check (public.rbac_module_can('lavorazioni', 'write'));

drop policy if exists cap_scheda_update on public.scheda_lavorazione;
create policy cap_scheda_update on public.scheda_lavorazione for update to authenticated
using (public.rbac_module_can('lavorazioni', 'write'))
with check (public.rbac_module_can('lavorazioni', 'write'));

drop policy if exists cap_scheda_delete on public.scheda_lavorazione;
create policy cap_scheda_delete on public.scheda_lavorazione for delete to authenticated
using (public.rbac_module_can('lavorazioni', 'write'));

drop policy if exists cap_documenti_insert on public.documenti;
create policy cap_documenti_insert on public.documenti for insert to authenticated
with check (public.rbac_module_can('documenti', 'write'));

drop policy if exists cap_documenti_update on public.documenti;
create policy cap_documenti_update on public.documenti for update to authenticated
using (public.rbac_module_can('documenti', 'write'))
with check (public.rbac_module_can('documenti', 'write'));

drop policy if exists cap_documenti_delete on public.documenti;
create policy cap_documenti_delete on public.documenti for delete to authenticated
using (public.rbac_module_can('documenti', 'write'));

drop policy if exists cap_preventivi_insert on public.preventivi;
create policy cap_preventivi_insert on public.preventivi for insert to authenticated
with check (public.rbac_module_can('preventivi', 'write'));

drop policy if exists cap_preventivi_update on public.preventivi;
create policy cap_preventivi_update on public.preventivi for update to authenticated
using (public.rbac_module_can('preventivi', 'write'))
with check (public.rbac_module_can('preventivi', 'write'));

drop policy if exists cap_preventivi_delete on public.preventivi;
create policy cap_preventivi_delete on public.preventivi for delete to authenticated
using (public.rbac_module_can('preventivi', 'write'));

drop policy if exists cap_log_insert on public.log_modifiche;
create policy cap_log_insert on public.log_modifiche for insert to authenticated
with check (
  public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
  and (
    public.rbac_log_entita_module(entita) is null
    or public.user_effective_can(public.rbac_log_entita_module(entita), 'write')
  )
);

-- report_manual_entries / support_notes (nessun modulo dedicato: almeno un modulo read / write)
drop policy if exists cap_report_manual_entries_select on public.report_manual_entries;
create policy cap_report_manual_entries_select on public.report_manual_entries for select to authenticated
using (deleted_at is null and public.rbac_module_can('report', 'read'));

drop policy if exists cap_report_manual_entries_insert on public.report_manual_entries;
create policy cap_report_manual_entries_insert on public.report_manual_entries for insert to authenticated
with check (
  public.rbac_module_can('report', 'write')
  and created_by = public.rbac_auth_uid()
);

drop policy if exists cap_report_manual_entries_update on public.report_manual_entries;
create policy cap_report_manual_entries_update on public.report_manual_entries for update to authenticated
using (public.rbac_module_can('report', 'write'))
with check (public.rbac_module_can('report', 'write'));

drop policy if exists cap_support_notes_select on public.support_notes;
create policy cap_support_notes_select on public.support_notes for select to authenticated
using (deleted_at is null and public.rbac_staff_has_any_module_read());

drop policy if exists cap_support_notes_insert on public.support_notes;
create policy cap_support_notes_insert on public.support_notes for insert to authenticated
with check (
  public.rbac_staff_has_any_module_read()
  and created_by = public.rbac_auth_uid()
);

-- ---------------------------------------------------------------------------
-- 6. Storage documenti — SELECT legato a metadata (path noto in DB)
-- ---------------------------------------------------------------------------
create or replace function public.rbac_storage_documenti_path_allowed(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text;
  v_folder text;
  v_lavorazione_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_path := trim(both '/' from coalesce(p_object_name, ''));
  if v_path = '' then
    return false;
  end if;

  v_folder := (storage.foldername(p_object_name))[1];

  if v_folder = 'lavorazioni' then
    begin
      v_lavorazione_id := ((storage.foldername(p_object_name))[2])::uuid;
    exception
      when others then
        return false;
    end;
    if public.rbac_is_cliente() then
      return public.rbac_lavorazione_visible_to_cliente(v_lavorazione_id);
    end if;
    if not public.user_effective_can('lavorazioni', 'read') then
      return false;
    end if;
    return exists (
      select 1
      from public.lavorazione_documents ld
      where ld.lavorazione_id = v_lavorazione_id
        and ld.storage_path = v_path
    );
  end if;

  if public.rbac_is_cliente() then
    return false;
  end if;

  if not public.user_effective_can('documenti', 'read') then
    return false;
  end if;

  return exists (
    select 1
    from public.documenti d
    where d.url_file = v_path
  );
end;
$$;

drop policy if exists cap_storage_documenti_select on storage.objects;
drop policy if exists rbac_storage_documenti_select on storage.objects;

create policy cap_storage_documenti_select on storage.objects
for select to authenticated
using (
  bucket_id = 'documenti'
  and public.rbac_storage_documenti_path_allowed(name)
);

drop policy if exists cap_storage_documenti_insert on storage.objects;
create policy cap_storage_documenti_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documenti'
  and public.rbac_module_can('documenti', 'write')
  and coalesce((storage.foldername(name))[1], '') <> ''
);

drop policy if exists cap_storage_documenti_update on storage.objects;
create policy cap_storage_documenti_update on storage.objects
for update to authenticated
using (bucket_id = 'documenti' and public.rbac_module_can('documenti', 'write'))
with check (bucket_id = 'documenti' and public.rbac_module_can('documenti', 'write'));

drop policy if exists cap_storage_documenti_delete on storage.objects;
create policy cap_storage_documenti_delete on storage.objects for delete to authenticated
using (bucket_id = 'documenti' and public.rbac_module_can('documenti', 'write'));

drop policy if exists rbac_storage_documenti_lavorazioni_cliente_select on storage.objects;

-- ---------------------------------------------------------------------------
-- 7. RPC delete_mezzo — richiede admin modulo mezzi
-- ---------------------------------------------------------------------------
create or replace function public.delete_mezzo(p_mezzo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active int;
  v_preventivi int;
begin
  if p_mezzo_id is null then
    raise exception 'Mezzo non valido';
  end if;

  if not public.user_effective_can('mezzi', 'admin')
    and not public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security') then
    raise exception 'Permesso negato';
  end if;

  select count(*)::int into v_active
  from public.lavorazioni l
  where l.mezzo_id = p_mezzo_id and l.deleted_at is null;

  if v_active > 0 then
    raise exception 'Impossibile eliminare il mezzo: restano lavorazioni attive collegate.';
  end if;

  select count(*)::int into v_preventivi
  from public.preventivi p
  where p.mezzo_id = p_mezzo_id;

  if v_preventivi > 0 then
    raise exception 'Impossibile eliminare il mezzo: restano preventivi collegati.';
  end if;

  delete from public.lavorazioni l
  where l.mezzo_id = p_mezzo_id and l.deleted_at is not null;

  delete from public.mezzi m
  where m.id = p_mezzo_id;

  if not found then
    raise exception 'Mezzo non trovato';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Disclosure ruolo altri utenti
-- ---------------------------------------------------------------------------
revoke execute on function public.rbac_role_for_user(uuid) from authenticated;

-- Grants nuove funzioni
revoke all on function public.rbac_module_can(text, text) from public;
revoke all on function public.rbac_resource_module_can(text, text) from public;
revoke all on function public.rbac_storage_documenti_path_allowed(text) from public;
revoke all on function public.rbac_staff_has_any_module_read() from public;
grant execute on function public.rbac_module_can(text, text) to authenticated;
grant execute on function public.rbac_resource_module_can(text, text) to authenticated;
grant execute on function public.rbac_storage_documenti_path_allowed(text) to authenticated;
grant execute on function public.rbac_staff_has_any_module_read() to authenticated;
