-- RBAC ufficiale: admin / operatore / ospite.
-- Mantiene RLS semplice: admin totale, operatore operativo, ospite sola lettura.

do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'ruolo_profile' and e.enumlabel = 'tecnico'
  ) and not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'ruolo_profile' and e.enumlabel = 'operatore'
  ) then
    alter type public.ruolo_profile rename value 'tecnico' to 'operatore';
  end if;

  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'ruolo_profile' and e.enumlabel = 'viewer'
  ) and not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'ruolo_profile' and e.enumlabel = 'ospite'
  ) then
    alter type public.ruolo_profile rename value 'viewer' to 'ospite';
  end if;
end $$;

alter table public.profiles alter column ruolo set default 'operatore'::public.ruolo_profile;

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
  v_ruolo public.ruolo_profile := 'operatore'::public.ruolo_profile;
begin
  v_app_nome := nullif(trim(coalesce(new.raw_app_meta_data ->> 'cab_nome', '')), '');
  v_nome := coalesce(v_app_nome, nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''), 'utente');
  v_app_ruolo := nullif(trim(coalesce(new.raw_app_meta_data ->> 'cab_ruolo', '')), '');

  if v_app_ruolo in ('admin', 'operatore', 'ospite') then
    v_ruolo := v_app_ruolo::public.ruolo_profile;
  elsif v_app_ruolo = 'tecnico' then
    v_ruolo := 'operatore'::public.ruolo_profile;
  elsif v_app_ruolo = 'viewer' then
    v_ruolo := 'ospite'::public.ruolo_profile;
  end if;

  insert into public.profiles (id, nome, ruolo)
  values (new.id, v_nome, v_ruolo)
  on conflict (id) do update
    set nome = excluded.nome,
        ruolo = excluded.ruolo;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

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

  v_role := public.current_profile_role();
  if v_role = 'admin' then
    return true;
  end if;

  select can_read, can_write, can_admin
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

  if v_role in ('ospite', 'viewer') then
    return p_op = 'read';
  end if;
  if v_role in ('operatore', 'tecnico') then
    return p_op in ('read', 'write');
  end if;
  return false;
end;
$$;

revoke all on function public.user_effective_can(text, text) from public;
grant execute on function public.user_effective_can(text, text) to authenticated;

-- Profili
drop policy if exists profiles_select_role on public.profiles;
create policy profiles_select_role
on public.profiles for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'tecnico', 'viewer'));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles for update to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin
on public.profiles for delete to authenticated
using (public.current_profile_role() = 'admin');

-- Helper policy: read all, write admin+operatore, delete solo admin.
drop policy if exists mezzi_select_role on public.mezzi;
create policy mezzi_select_role on public.mezzi for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'tecnico', 'viewer'));
drop policy if exists mezzi_insert_priv on public.mezzi;
create policy mezzi_insert_priv on public.mezzi for insert to authenticated
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists mezzi_update_priv on public.mezzi;
create policy mezzi_update_priv on public.mezzi for update to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists mezzi_delete_priv on public.mezzi;
create policy mezzi_delete_priv on public.mezzi for delete to authenticated
using (public.current_profile_role() = 'admin');

drop policy if exists lavorazioni_select_role on public.lavorazioni;
create policy lavorazioni_select_role on public.lavorazioni for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'tecnico', 'viewer'));
drop policy if exists lavorazioni_insert_priv on public.lavorazioni;
create policy lavorazioni_insert_priv on public.lavorazioni for insert to authenticated
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists lavorazioni_update_priv on public.lavorazioni;
create policy lavorazioni_update_priv on public.lavorazioni for update to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists lavorazioni_delete_priv on public.lavorazioni;
create policy lavorazioni_delete_priv on public.lavorazioni for delete to authenticated
using (public.current_profile_role() = 'admin');

drop policy if exists scheda_lavorazione_select_role on public.scheda_lavorazione;
create policy scheda_lavorazione_select_role on public.scheda_lavorazione for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'tecnico', 'viewer'));
drop policy if exists scheda_lavorazione_insert_priv on public.scheda_lavorazione;
create policy scheda_lavorazione_insert_priv on public.scheda_lavorazione for insert to authenticated
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists scheda_lavorazione_update_priv on public.scheda_lavorazione;
create policy scheda_lavorazione_update_priv on public.scheda_lavorazione for update to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists scheda_lavorazione_delete_priv on public.scheda_lavorazione;
create policy scheda_lavorazione_delete_priv on public.scheda_lavorazione for delete to authenticated
using (public.current_profile_role() = 'admin');

drop policy if exists magazzino_ricambi_select_role on public.magazzino_ricambi;
create policy magazzino_ricambi_select_role on public.magazzino_ricambi for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'tecnico', 'viewer'));
drop policy if exists magazzino_ricambi_insert_priv on public.magazzino_ricambi;
create policy magazzino_ricambi_insert_priv on public.magazzino_ricambi for insert to authenticated
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists magazzino_ricambi_update_priv on public.magazzino_ricambi;
create policy magazzino_ricambi_update_priv on public.magazzino_ricambi for update to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists magazzino_ricambi_delete_priv on public.magazzino_ricambi;
create policy magazzino_ricambi_delete_priv on public.magazzino_ricambi for delete to authenticated
using (public.current_profile_role() = 'admin');

drop policy if exists movimenti_ricambi_select_role on public.movimenti_ricambi;
create policy movimenti_ricambi_select_role on public.movimenti_ricambi for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'tecnico', 'viewer'));
drop policy if exists movimenti_ricambi_insert_priv on public.movimenti_ricambi;
create policy movimenti_ricambi_insert_priv on public.movimenti_ricambi for insert to authenticated
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists movimenti_ricambi_update_priv on public.movimenti_ricambi;
create policy movimenti_ricambi_update_priv on public.movimenti_ricambi for update to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists movimenti_ricambi_delete_priv on public.movimenti_ricambi;
create policy movimenti_ricambi_delete_priv on public.movimenti_ricambi for delete to authenticated
using (public.current_profile_role() = 'admin');

drop policy if exists preventivi_select_role on public.preventivi;
create policy preventivi_select_role on public.preventivi for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'tecnico', 'viewer'));
drop policy if exists preventivi_insert_priv on public.preventivi;
create policy preventivi_insert_priv on public.preventivi for insert to authenticated
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists preventivi_update_priv on public.preventivi;
create policy preventivi_update_priv on public.preventivi for update to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists preventivi_delete_priv on public.preventivi;
create policy preventivi_delete_priv on public.preventivi for delete to authenticated
using (public.current_profile_role() = 'admin');

drop policy if exists documenti_select_role on public.documenti;
create policy documenti_select_role on public.documenti for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'tecnico', 'viewer'));
drop policy if exists documenti_insert_priv on public.documenti;
create policy documenti_insert_priv on public.documenti for insert to authenticated
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists documenti_update_priv on public.documenti;
create policy documenti_update_priv on public.documenti for update to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'tecnico'))
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));
drop policy if exists documenti_delete_priv on public.documenti;
create policy documenti_delete_priv on public.documenti for delete to authenticated
using (public.current_profile_role() = 'admin');

drop policy if exists log_modifiche_select_role on public.log_modifiche;
create policy log_modifiche_select_role on public.log_modifiche for select to authenticated
using (public.current_profile_role() in ('admin', 'operatore', 'ospite', 'tecnico', 'viewer'));
drop policy if exists log_modifiche_insert_priv on public.log_modifiche;
create policy log_modifiche_insert_priv on public.log_modifiche for insert to authenticated
with check (public.current_profile_role() in ('admin', 'operatore', 'tecnico'));

-- auth_logs: lettura solo admin, insert invariato per flussi login/logout.
drop policy if exists auth_logs_select on public.auth_logs;
create policy auth_logs_select
on public.auth_logs for select to authenticated
using (public.current_profile_role() = 'admin');

-- Global settings: lettura per utenti autenticati, scrittura solo admin.
drop policy if exists app_settings_select_auth on public.app_settings;
create policy app_settings_select_auth
on public.app_settings for select to authenticated
using (exists (select 1 from public.profiles pr where pr.id = auth.uid()));

drop policy if exists app_settings_insert_admin on public.app_settings;
create policy app_settings_insert_admin
on public.app_settings for insert to authenticated
with check (public.current_profile_role() = 'admin');

drop policy if exists app_settings_update_admin on public.app_settings;
create policy app_settings_update_admin
on public.app_settings for update to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists app_settings_delete_admin on public.app_settings;
create policy app_settings_delete_admin
on public.app_settings for delete to authenticated
using (public.current_profile_role() = 'admin');
