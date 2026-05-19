-- Security hardening: RLS unificato su ruolo_utente (admin / operatore / ospite / cliente).
-- Idempotente: DROP POLICY IF EXISTS + funzioni SECURITY DEFINER per evitare bypass API.

-- ---------------------------------------------------------------------------
-- 1. Colonna associazione cliente (allineata a mezzi.cliente)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists cliente_ref text;

comment on column public.profiles.cliente_ref is
  'Etichetta cliente (mezzi.cliente) per utenti ruolo=cliente; obbligatoria per visibilità lavorazioni.';

create index if not exists idx_profiles_cliente_ref
  on public.profiles (cliente_ref)
  where cliente_ref is not null;

-- ---------------------------------------------------------------------------
-- 2. Helper RBAC (SECURITY DEFINER — no ricorsione RLS su profiles)
-- ---------------------------------------------------------------------------
create or replace function public.rbac_normalized_role()
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
  select public.rbac_normalized_role() = 'admin';
$$;

create or replace function public.rbac_is_operatore()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_normalized_role() = 'operatore';
$$;

create or replace function public.rbac_is_ospite()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_normalized_role() = 'ospite';
$$;

create or replace function public.rbac_is_cliente()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_normalized_role() = 'cliente';
$$;

create or replace function public.rbac_can_read_operational()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_normalized_role() in ('admin', 'operatore', 'ospite');
$$;

create or replace function public.rbac_can_write_operational()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_normalized_role() in ('admin', 'operatore');
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
  where p.id = auth.uid();
$$;

create or replace function public.rbac_mezzo_visible_to_cliente(p_mezzo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.rbac_is_cliente()
    and public.rbac_cliente_ref() is not null
    and exists (
      select 1
      from public.mezzi m
      where m.id = p_mezzo_id
        and m.cliente = public.rbac_cliente_ref()
    );
$$;

create or replace function public.rbac_lavorazione_visible_to_cliente(p_lavorazione_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.rbac_is_cliente()
    and public.rbac_cliente_ref() is not null
    and exists (
      select 1
      from public.lavorazioni l
      join public.mezzi m on m.id = l.mezzo_id
      where l.id = p_lavorazione_id
        and m.cliente = public.rbac_cliente_ref()
    );
$$;

create or replace function public.rbac_can_read_lavorazione_row(p_mezzo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.rbac_can_read_operational()
    or public.rbac_mezzo_visible_to_cliente(p_mezzo_id);
$$;

create or replace function public.rbac_can_read_log_row(p_entita text, p_entita_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.rbac_is_admin() then true
    when public.rbac_can_write_operational() then true
    when public.rbac_is_cliente()
      and p_entita = 'lavorazioni'
      and public.rbac_lavorazione_visible_to_cliente(p_entita_id) then true
    else false
  end;
$$;

revoke all on function public.rbac_normalized_role() from public;
revoke all on function public.rbac_is_admin() from public;
revoke all on function public.rbac_is_operatore() from public;
revoke all on function public.rbac_is_ospite() from public;
revoke all on function public.rbac_is_cliente() from public;
revoke all on function public.rbac_can_read_operational() from public;
revoke all on function public.rbac_can_write_operational() from public;
revoke all on function public.rbac_cliente_ref() from public;
revoke all on function public.rbac_mezzo_visible_to_cliente(uuid) from public;
revoke all on function public.rbac_lavorazione_visible_to_cliente(uuid) from public;
revoke all on function public.rbac_can_read_lavorazione_row(uuid) from public;
revoke all on function public.rbac_can_read_log_row(text, uuid) from public;

grant execute on function public.rbac_normalized_role() to authenticated;
grant execute on function public.rbac_is_admin() to authenticated;
grant execute on function public.rbac_is_operatore() to authenticated;
grant execute on function public.rbac_is_ospite() to authenticated;
grant execute on function public.rbac_is_cliente() to authenticated;
grant execute on function public.rbac_can_read_operational() to authenticated;
grant execute on function public.rbac_can_write_operational() to authenticated;
grant execute on function public.rbac_cliente_ref() to authenticated;
grant execute on function public.rbac_mezzo_visible_to_cliente(uuid) to authenticated;
grant execute on function public.rbac_lavorazione_visible_to_cliente(uuid) to authenticated;
grant execute on function public.rbac_can_read_lavorazione_row(uuid) to authenticated;
grant execute on function public.rbac_can_read_log_row(text, uuid) to authenticated;

-- Cliente: read solo modulo lavorazioni in app_settings (stati portale).
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
    return p_op = 'read' and p_module = 'lavorazioni';
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

  if v_role = 'ospite' then
    return p_op = 'read';
  end if;
  if v_role = 'operatore' then
    return p_op in ('read', 'write');
  end if;
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. View portale clienti (security invoker → eredita RLS tabelle base)
-- ---------------------------------------------------------------------------
create or replace view public.lavorazioni_clienti
with (security_invoker = true) as
select
  l.id,
  l.mezzo_id,
  l.stato,
  l.priorita,
  l.data_ingresso,
  l.data_uscita,
  l.note,
  l.created_by,
  l.created_at,
  l.updated_at,
  m.cliente,
  m.utilizzatore,
  m.marca,
  m.modello,
  m.targa,
  m.matricola,
  m.numero_scuderia,
  m.anno
from public.lavorazioni l
inner join public.mezzi m on m.id = l.mezzo_id;

comment on view public.lavorazioni_clienti is
  'Portale clienti: join lavorazioni/mezzi; RLS ereditato dalle tabelle sottostanti.';

grant select on public.lavorazioni_clienti to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS obbligatorio su tutte le tabelle applicative
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.mezzi enable row level security;
alter table public.lavorazioni enable row level security;
alter table public.scheda_lavorazione enable row level security;
alter table public.magazzino_ricambi enable row level security;
alter table public.movimenti_ricambi enable row level security;
alter table public.preventivi enable row level security;
alter table public.documenti enable row level security;
alter table public.log_modifiche enable row level security;
alter table public.app_settings enable row level security;
alter table public.app_settings_audit enable row level security;
alter table public.user_permissions enable row level security;
alter table public.auth_logs enable row level security;
alter table public.segnalazioni enable row level security;

-- ---------------------------------------------------------------------------
-- 5. profiles — proprio profilo + admin gestione completa
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_role on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles for select to authenticated
using (id = auth.uid() or public.rbac_is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles for update to authenticated
using (public.rbac_is_admin())
with check (public.rbac_is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin
on public.profiles for delete to authenticated
using (public.rbac_is_admin());

-- ---------------------------------------------------------------------------
-- 6. mezzi
-- ---------------------------------------------------------------------------
drop policy if exists mezzi_select_role on public.mezzi;
create policy mezzi_select_role
on public.mezzi for select to authenticated
using (
  public.rbac_can_read_operational()
  or public.rbac_mezzo_visible_to_cliente(id)
);

drop policy if exists mezzi_insert_priv on public.mezzi;
create policy mezzi_insert_priv
on public.mezzi for insert to authenticated
with check (public.rbac_can_write_operational());

drop policy if exists mezzi_update_priv on public.mezzi;
create policy mezzi_update_priv
on public.mezzi for update to authenticated
using (public.rbac_can_write_operational())
with check (public.rbac_can_write_operational());

drop policy if exists mezzi_delete_priv on public.mezzi;
create policy mezzi_delete_priv
on public.mezzi for delete to authenticated
using (public.rbac_is_admin());

-- ---------------------------------------------------------------------------
-- 7. lavorazioni — cliente filtrato via mezzi.cliente = profiles.cliente_ref
-- ---------------------------------------------------------------------------
drop policy if exists lavorazioni_select_role on public.lavorazioni;
create policy lavorazioni_select_role
on public.lavorazioni for select to authenticated
using (public.rbac_can_read_lavorazione_row(mezzo_id));

drop policy if exists lavorazioni_insert_priv on public.lavorazioni;
create policy lavorazioni_insert_priv
on public.lavorazioni for insert to authenticated
with check (public.rbac_can_write_operational());

drop policy if exists lavorazioni_update_priv on public.lavorazioni;
create policy lavorazioni_update_priv
on public.lavorazioni for update to authenticated
using (public.rbac_can_write_operational())
with check (public.rbac_can_write_operational());

drop policy if exists lavorazioni_delete_priv on public.lavorazioni;
create policy lavorazioni_delete_priv
on public.lavorazioni for delete to authenticated
using (public.rbac_is_admin());

-- ---------------------------------------------------------------------------
-- 8. scheda_lavorazione — visibilità legata alla lavorazione padre
-- ---------------------------------------------------------------------------
drop policy if exists scheda_lavorazione_select_role on public.scheda_lavorazione;
create policy scheda_lavorazione_select_role
on public.scheda_lavorazione for select to authenticated
using (
  public.rbac_can_read_operational()
  or public.rbac_lavorazione_visible_to_cliente(lavorazione_id)
);

drop policy if exists scheda_lavorazione_insert_priv on public.scheda_lavorazione;
create policy scheda_lavorazione_insert_priv
on public.scheda_lavorazione for insert to authenticated
with check (public.rbac_can_write_operational());

drop policy if exists scheda_lavorazione_update_priv on public.scheda_lavorazione;
create policy scheda_lavorazione_update_priv
on public.scheda_lavorazione for update to authenticated
using (public.rbac_can_write_operational())
with check (public.rbac_can_write_operational());

drop policy if exists scheda_lavorazione_delete_priv on public.scheda_lavorazione;
create policy scheda_lavorazione_delete_priv
on public.scheda_lavorazione for delete to authenticated
using (public.rbac_is_admin());

-- ---------------------------------------------------------------------------
-- 9. magazzino — nessun accesso cliente
-- ---------------------------------------------------------------------------
drop policy if exists magazzino_ricambi_select_role on public.magazzino_ricambi;
create policy magazzino_ricambi_select_role
on public.magazzino_ricambi for select to authenticated
using (public.rbac_can_read_operational());

drop policy if exists magazzino_ricambi_insert_priv on public.magazzino_ricambi;
create policy magazzino_ricambi_insert_priv
on public.magazzino_ricambi for insert to authenticated
with check (public.rbac_can_write_operational());

drop policy if exists magazzino_ricambi_update_priv on public.magazzino_ricambi;
create policy magazzino_ricambi_update_priv
on public.magazzino_ricambi for update to authenticated
using (public.rbac_can_write_operational())
with check (public.rbac_can_write_operational());

drop policy if exists magazzino_ricambi_delete_priv on public.magazzino_ricambi;
create policy magazzino_ricambi_delete_priv
on public.magazzino_ricambi for delete to authenticated
using (public.rbac_is_admin());

drop policy if exists movimenti_ricambi_select_role on public.movimenti_ricambi;
create policy movimenti_ricambi_select_role
on public.movimenti_ricambi for select to authenticated
using (public.rbac_can_read_operational());

drop policy if exists movimenti_ricambi_insert_priv on public.movimenti_ricambi;
create policy movimenti_ricambi_insert_priv
on public.movimenti_ricambi for insert to authenticated
with check (public.rbac_can_write_operational());

drop policy if exists movimenti_ricambi_update_priv on public.movimenti_ricambi;
create policy movimenti_ricambi_update_priv
on public.movimenti_ricambi for update to authenticated
using (public.rbac_can_write_operational())
with check (public.rbac_can_write_operational());

drop policy if exists movimenti_ricambi_delete_priv on public.movimenti_ricambi;
create policy movimenti_ricambi_delete_priv
on public.movimenti_ricambi for delete to authenticated
using (public.rbac_is_admin());

-- ---------------------------------------------------------------------------
-- 10. preventivi — cliente solo propri (cliente text = cliente_ref)
-- ---------------------------------------------------------------------------
drop policy if exists preventivi_select_role on public.preventivi;
create policy preventivi_select_role
on public.preventivi for select to authenticated
using (
  public.rbac_can_read_operational()
  or (
    public.rbac_is_cliente()
    and public.rbac_cliente_ref() is not null
    and cliente = public.rbac_cliente_ref()
  )
);

drop policy if exists preventivi_insert_priv on public.preventivi;
create policy preventivi_insert_priv
on public.preventivi for insert to authenticated
with check (public.rbac_can_write_operational());

drop policy if exists preventivi_update_priv on public.preventivi;
create policy preventivi_update_priv
on public.preventivi for update to authenticated
using (public.rbac_can_write_operational())
with check (public.rbac_can_write_operational());

drop policy if exists preventivi_delete_priv on public.preventivi;
create policy preventivi_delete_priv
on public.preventivi for delete to authenticated
using (public.rbac_is_admin());

-- ---------------------------------------------------------------------------
-- 11. documenti — operativo; cliente escluso
-- ---------------------------------------------------------------------------
drop policy if exists documenti_select_role on public.documenti;
create policy documenti_select_role
on public.documenti for select to authenticated
using (public.rbac_can_read_operational());

drop policy if exists documenti_insert_priv on public.documenti;
create policy documenti_insert_priv
on public.documenti for insert to authenticated
with check (public.rbac_can_write_operational());

drop policy if exists documenti_update_priv on public.documenti;
create policy documenti_update_priv
on public.documenti for update to authenticated
using (public.rbac_can_write_operational())
with check (public.rbac_can_write_operational());

drop policy if exists documenti_delete_priv on public.documenti;
create policy documenti_delete_priv
on public.documenti for delete to authenticated
using (public.rbac_is_admin());

-- ---------------------------------------------------------------------------
-- 12. log_modifiche — append + undo operatore; purge solo admin
-- ---------------------------------------------------------------------------
drop policy if exists log_modifiche_select_role on public.log_modifiche;
create policy log_modifiche_select_role
on public.log_modifiche for select to authenticated
using (public.rbac_can_read_log_row(entita, entita_id));

drop policy if exists log_modifiche_insert_priv on public.log_modifiche;
create policy log_modifiche_insert_priv
on public.log_modifiche for insert to authenticated
with check (public.rbac_can_write_operational());

drop policy if exists log_modifiche_update_priv on public.log_modifiche;
create policy log_modifiche_update_priv
on public.log_modifiche for update to authenticated
using (public.rbac_can_write_operational())
with check (public.rbac_can_write_operational());

drop policy if exists log_modifiche_delete_admin on public.log_modifiche;
create policy log_modifiche_delete_admin
on public.log_modifiche for delete to authenticated
using (public.rbac_is_admin());

-- ---------------------------------------------------------------------------
-- 13. segnalazioni — visibilità operativa; modifiche admin/operatore; no cliente
-- ---------------------------------------------------------------------------
drop policy if exists segnalazioni_select_role on public.segnalazioni;
create policy segnalazioni_select_role
on public.segnalazioni for select to authenticated
using (
  deleted_at is null
  and public.rbac_can_read_operational()
);

drop policy if exists segnalazioni_insert_role on public.segnalazioni;
create policy segnalazioni_insert_role
on public.segnalazioni for insert to authenticated
with check (
  created_by = auth.uid()
  and public.rbac_can_write_operational()
);

drop policy if exists segnalazioni_update_role on public.segnalazioni;
create policy segnalazioni_update_role
on public.segnalazioni for update to authenticated
using (public.rbac_can_write_operational())
with check (public.rbac_can_write_operational());

-- ---------------------------------------------------------------------------
-- 14. Sicurezza: user_permissions, auth_logs, app_settings_audit
-- ---------------------------------------------------------------------------
drop policy if exists user_permissions_select_own_or_admin on public.user_permissions;
create policy user_permissions_select_admin
on public.user_permissions for select to authenticated
using (public.rbac_is_admin());

drop policy if exists user_permissions_write_admin on public.user_permissions;
create policy user_permissions_write_admin
on public.user_permissions for all to authenticated
using (public.rbac_is_admin())
with check (public.rbac_is_admin());

drop policy if exists auth_logs_select on public.auth_logs;
create policy auth_logs_select
on public.auth_logs for select to authenticated
using (public.rbac_is_admin());

drop policy if exists app_settings_audit_select_admin on public.app_settings_audit;
create policy app_settings_audit_select_admin
on public.app_settings_audit for select to authenticated
using (public.rbac_is_admin());

-- ---------------------------------------------------------------------------
-- 15. app_settings — read modulare; write solo admin
-- ---------------------------------------------------------------------------
drop policy if exists app_settings_select_auth on public.app_settings;
create policy app_settings_select_auth
on public.app_settings for select to authenticated
using (
  exists (select 1 from public.profiles pr where pr.id = auth.uid())
  and public.user_effective_can(module, 'read')
);

drop policy if exists app_settings_insert_admin on public.app_settings;
create policy app_settings_insert_admin
on public.app_settings for insert to authenticated
with check (public.rbac_is_admin());

drop policy if exists app_settings_update_admin on public.app_settings;
create policy app_settings_update_admin
on public.app_settings for update to authenticated
using (public.rbac_is_admin())
with check (public.rbac_is_admin());

drop policy if exists app_settings_delete_admin on public.app_settings;
create policy app_settings_delete_admin
on public.app_settings for delete to authenticated
using (public.rbac_is_admin());

-- ---------------------------------------------------------------------------
-- 16. Storage — bucket images/documenti allineati al RBAC
-- ---------------------------------------------------------------------------
drop policy if exists cab_images_select on storage.objects;
create policy cab_images_select
on storage.objects for select to authenticated
using (
  bucket_id = 'images'
  and (
    public.rbac_can_read_operational()
    or (
      public.rbac_is_cliente()
      and (storage.foldername(name))[1] = 'lavorazioni'
      and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.rbac_lavorazione_visible_to_cliente(((storage.foldername(name))[2])::uuid)
    )
  )
);

drop policy if exists cab_images_insert on storage.objects;
create policy cab_images_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'images'
  and public.rbac_can_write_operational()
  and (storage.foldername(name))[1] in ('mezzi', 'magazzino', 'lavorazioni')
  and coalesce((storage.foldername(name))[2], '') <> ''
);

drop policy if exists cab_images_update on storage.objects;
create policy cab_images_update
on storage.objects for update to authenticated
using (bucket_id = 'images' and public.rbac_can_write_operational())
with check (bucket_id = 'images' and public.rbac_can_write_operational());

drop policy if exists cab_images_delete on storage.objects;
create policy cab_images_delete
on storage.objects for delete to authenticated
using (bucket_id = 'images' and public.rbac_can_write_operational());

drop policy if exists cab_documenti_select on storage.objects;
create policy cab_documenti_select
on storage.objects for select to authenticated
using (bucket_id = 'documenti' and public.rbac_can_read_operational());

drop policy if exists cab_documenti_insert on storage.objects;
create policy cab_documenti_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documenti'
  and public.rbac_can_write_operational()
  and coalesce((storage.foldername(name))[1], '') <> ''
);

drop policy if exists cab_documenti_update on storage.objects;
create policy cab_documenti_update
on storage.objects for update to authenticated
using (bucket_id = 'documenti' and public.rbac_can_write_operational())
with check (bucket_id = 'documenti' and public.rbac_can_write_operational());

drop policy if exists cab_documenti_delete on storage.objects;
create policy cab_documenti_delete
on storage.objects for delete to authenticated
using (bucket_id = 'documenti' and public.rbac_can_write_operational());

-- ---------------------------------------------------------------------------
-- 17. Revoke accesso anonimo (eccetto auth_logs login_failed)
-- ---------------------------------------------------------------------------
revoke all on table public.profiles from anon;
revoke all on table public.mezzi from anon;
revoke all on table public.lavorazioni from anon;
revoke all on table public.scheda_lavorazione from anon;
revoke all on table public.magazzino_ricambi from anon;
revoke all on table public.movimenti_ricambi from anon;
revoke all on table public.preventivi from anon;
revoke all on table public.documenti from anon;
revoke all on table public.log_modifiche from anon;
revoke all on table public.app_settings from anon;
revoke all on table public.app_settings_audit from anon;
revoke all on table public.user_permissions from anon;
revoke all on table public.segnalazioni from anon;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.mezzi to authenticated;
grant select, insert, update, delete on table public.lavorazioni to authenticated;
grant select, insert, update, delete on table public.scheda_lavorazione to authenticated;
grant select, insert, update, delete on table public.magazzino_ricambi to authenticated;
grant select, insert, update, delete on table public.movimenti_ricambi to authenticated;
grant select, insert, update, delete on table public.preventivi to authenticated;
grant select, insert, update, delete on table public.documenti to authenticated;
grant select, insert, update, delete on table public.log_modifiche to authenticated;
grant select, insert, update, delete on table public.app_settings to authenticated;
grant select on table public.app_settings_audit to authenticated;
grant select, insert, update, delete on table public.user_permissions to authenticated;
grant select, insert, update on table public.segnalazioni to authenticated;
grant select on table public.auth_logs to authenticated;
grant insert on table public.auth_logs to authenticated;
grant insert on table public.auth_logs to anon;

-- ---------------------------------------------------------------------------
-- 18. Verifica finale (NOTICE in push log)
-- ---------------------------------------------------------------------------
do $$
declare
  v_table text;
  v_missing_rls text[] := array[]::text[];
  v_tables text[] := array[
    'profiles', 'mezzi', 'lavorazioni', 'scheda_lavorazione',
    'magazzino_ricambi', 'movimenti_ricambi', 'preventivi', 'documenti',
    'log_modifiche', 'app_settings', 'app_settings_audit', 'user_permissions',
    'auth_logs', 'segnalazioni'
  ];
begin
  foreach v_table in array v_tables loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = v_table
        and c.relrowsecurity
    ) then
      v_missing_rls := array_append(v_missing_rls, v_table);
    end if;
  end loop;

  if coalesce(array_length(v_missing_rls, 1), 0) > 0 then
    raise exception 'RLS non attivo su: %', array_to_string(v_missing_rls, ', ');
  end if;

  raise notice 'RLS security hardening OK: % tabelle protette.', coalesce(array_length(v_tables, 1), 0);
end $$;
