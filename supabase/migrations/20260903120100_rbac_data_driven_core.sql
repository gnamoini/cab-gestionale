-- RBAC data-driven core: Postgres = runtime SSOT.
-- Seed from legacy TS matrix (lib/rbac.ts RBAC_SEED_*).

-- =============================================================================
-- 1. Catalog tables
-- =============================================================================

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  module text,
  action text,
  label text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  effect text not null default 'allow' check (effect = 'allow'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id),
  unique (user_id)
);

-- =============================================================================
-- 2. Seed permissions
-- =============================================================================

insert into public.permissions (key, module, action, label, description, is_system)
values
  ('magazzino.read', 'magazzino', 'read', 'Magazzino — lettura', null, true),
  ('magazzino.write', 'magazzino', 'write', 'Magazzino — scrittura', null, true),
  ('preventivi.read', 'preventivi', 'read', 'Preventivi — lettura', null, true),
  ('preventivi.write', 'preventivi', 'write', 'Preventivi — scrittura', null, true),
  ('lavorazioni.read', 'lavorazioni', 'read', 'Lavorazioni — lettura', null, true),
  ('lavorazioni.write', 'lavorazioni', 'write', 'Lavorazioni — scrittura', null, true),
  ('mezzi.read', 'mezzi', 'read', 'Mezzi — lettura', null, true),
  ('mezzi.write', 'mezzi', 'write', 'Mezzi — scrittura', null, true),
  ('report.read', 'report', 'read', 'Report — lettura', null, true),
  ('report.write', 'report', 'write', 'Report — scrittura', null, true),
  ('documenti.read', 'documenti', 'read', 'Documenti — lettura', null, true),
  ('documenti.write', 'documenti', 'write', 'Documenti — scrittura', null, true),
  ('dipendenti.read', 'dipendenti', 'read', 'Dipendenti — lettura', null, true),
  ('dipendenti.write', 'dipendenti', 'write', 'Dipendenti — scrittura', null, true),
  ('fatturazione.read', 'fatturazione', 'read', 'Fatturazione — lettura', null, true),
  ('fatturazione.write', 'fatturazione', 'write', 'Fatturazione — scrittura', null, true),
  ('ddt.read', 'ddt', 'read', 'DDT — lettura', null, true),
  ('ddt.write', 'ddt', 'write', 'DDT — scrittura', null, true),
  ('ordini_fornitori.read', 'ordini_fornitori', 'read', 'Ordini fornitori — lettura', null, true),
  ('ordini_fornitori.write', 'ordini_fornitori', 'write', 'Ordini fornitori — scrittura', null, true),
  ('document_capture.read', 'document_capture', 'read', 'Acquisizione documenti — lettura', null, true),
  ('document_capture.write', 'document_capture', 'write', 'Acquisizione documenti — scrittura', null, true),
  ('can_read_operational', null, 'capability', 'Lettura operativa', null, true),
  ('can_write_operational', null, 'capability', 'Scrittura operativa', null, true),
  ('can_manage_settings', null, 'capability', 'Gestione configurazione', null, true),
  ('can_manage_security', null, 'capability', 'Gestione sicurezza', null, true),
  ('can_access_client_area', null, 'capability', 'Portale clienti', null, true)
on conflict (key) do nothing;

-- =============================================================================
-- 3. Seed system roles
-- =============================================================================

insert into public.roles (key, name, description, is_system, is_active)
values
  ('admin', 'Admin', 'Accesso completo', true, true),
  ('manager', 'Direttore', 'Gestione operativa e configurazione', true, true),
  ('operatore', 'Personale Tecnico', 'Area officina', true, true),
  ('addetto_amministrativo', 'Personale Amministrativo', 'Area amministrativa', true, true),
  ('cliente', 'Cliente', 'Portale clienti', true, true),
  ('guest', 'Ospite', 'Audit read-only', true, true)
on conflict (key) do nothing;

create or replace function public._rbac_seed_grant(p_role_key text, p_perm_keys text[])
returns void
language plpgsql
as $$
declare
  v_role_id uuid;
  v_perm_id uuid;
  k text;
begin
  select id into v_role_id from public.roles where key = p_role_key;
  if v_role_id is null then return; end if;
  foreach k in array p_perm_keys loop
    select id into v_perm_id from public.permissions where key = k;
    if v_perm_id is not null then
      insert into public.role_permissions (role_id, permission_id, effect)
      values (v_role_id, v_perm_id, 'allow')
      on conflict (role_id, permission_id) do nothing;
    end if;
  end loop;
end;
$$;

insert into public.role_permissions (role_id, permission_id, effect)
select r.id, p.id, 'allow'
from public.roles r
cross join public.permissions p
where r.key = 'admin'
on conflict do nothing;

select public._rbac_seed_grant('manager', array[
  'magazzino.read','magazzino.write','preventivi.read','preventivi.write',
  'lavorazioni.read','lavorazioni.write','mezzi.read','mezzi.write',
  'report.read','report.write','documenti.read','documenti.write',
  'dipendenti.read','dipendenti.write','fatturazione.read','fatturazione.write',
  'ddt.read','ddt.write','ordini_fornitori.read','ordini_fornitori.write',
  'document_capture.read','document_capture.write',
  'can_read_operational','can_write_operational','can_manage_settings'
]);

select public._rbac_seed_grant('operatore', array[
  'magazzino.read','magazzino.write','lavorazioni.read','lavorazioni.write',
  'mezzi.read','mezzi.write','documenti.read','documenti.write',
  'document_capture.read','document_capture.write',
  'can_read_operational','can_write_operational'
]);

select public._rbac_seed_grant('addetto_amministrativo', array[
  'preventivi.read','preventivi.write','fatturazione.read','fatturazione.write',
  'ddt.read','ddt.write','ordini_fornitori.read','ordini_fornitori.write',
  'report.read','report.write',
  'can_read_operational','can_write_operational'
]);

insert into public.role_permissions (role_id, permission_id, effect)
select r.id, p.id, 'allow'
from public.roles r
cross join public.permissions p
where r.key = 'guest'
  and (p.action = 'read' or p.key = 'can_read_operational')
on conflict do nothing;

select public._rbac_seed_grant('cliente', array['can_access_client_area']);

drop function if exists public._rbac_seed_grant(text, text[]);

-- =============================================================================
-- 4. profiles.role_key cutover
-- =============================================================================

alter table public.profiles add column if not exists role_key text;

update public.profiles p
set role_key = case public.rbac_normalize_role(p.ruolo::text)
  when '' then 'guest'
  when 'admin' then 'admin'
  when 'manager' then 'manager'
  when 'operatore' then 'operatore'
  when 'addetto_amministrativo' then 'addetto_amministrativo'
  when 'cliente' then 'cliente'
  when 'guest' then 'guest'
  else 'guest'
end
where p.role_key is null;

alter table public.profiles alter column role_key set not null;

alter table public.profiles drop constraint if exists profiles_role_key_fkey;
alter table public.profiles
  add constraint profiles_role_key_fkey foreign key (role_key) references public.roles (key);

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.key = p.role_key
on conflict (user_id) do update set role_id = excluded.role_id;

-- =============================================================================
-- 5. Migrate user_permissions
-- =============================================================================

create table if not exists public.user_permissions_v2 (
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  effect text not null check (effect in ('allow', 'deny')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, permission_id)
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_permissions' and column_name = 'module'
  ) then
    insert into public.user_permissions_v2 (user_id, permission_id, effect)
    select up.user_id, p.id,
      case
        when p.action = 'read' and up.can_read then 'allow'
        when p.action = 'read' and not up.can_read then 'deny'
        when p.action = 'write' and up.can_write then 'allow'
        when p.action = 'write' and not up.can_write then 'deny'
        else 'deny'
      end
    from public.user_permissions up
    join public.permissions p on p.module = up.module and p.action in ('read', 'write')
    on conflict (user_id, permission_id) do update set effect = excluded.effect, updated_at = now();

    drop table public.user_permissions;
    alter table public.user_permissions_v2 rename to user_permissions;
  elsif not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_permissions'
  ) then
    alter table public.user_permissions_v2 rename to user_permissions;
  end if;
end $$;

create index if not exists idx_user_permissions_user on public.user_permissions (user_id);
create index if not exists idx_role_permissions_role on public.role_permissions (role_id);

-- =============================================================================
-- 6. Drop legacy enum column
-- =============================================================================

drop trigger if exists trg_profiles_ruolo_guard on public.profiles;

alter table public.profiles drop column if exists ruolo;

-- =============================================================================
-- 7. RBAC SQL engine
-- =============================================================================

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

create or replace function public.rbac_role_for_user(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select r.key
     from public.user_roles ur
     join public.roles r on r.id = ur.role_id
     where ur.user_id = p_user_id and r.is_active),
    (select p.role_key from public.profiles p where p.id = p_user_id),
    'guest'
  );
$$;

create or replace function public.rbac_normalized_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_role_for_user(public.rbac_auth_uid());
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_normalized_role();
$$;

create or replace function public.rbac_is_valid_erp_module(p_module text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_module, '') in (
    'magazzino', 'preventivi', 'lavorazioni', 'mezzi', 'report',
    'documenti', 'dipendenti', 'fatturazione', 'ddt', 'ordini_fornitori', 'document_capture'
  );
$$;

create or replace function public.rbac_role_has_permission(p_role_key text, p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.roles r
    join public.role_permissions rp on rp.role_id = r.id and rp.effect = 'allow'
    join public.permissions p on p.id = rp.permission_id
    where r.key = p_role_key and r.is_active and p.key = p_permission_key
  );
$$;

create or replace function public.rbac_user_effective_permission(p_user_id uuid, p_permission_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role_key text;
  v_override text;
begin
  if p_user_id is null or p_permission_key is null or p_permission_key = '' then
    return false;
  end if;

  v_role_key := public.rbac_role_for_user(p_user_id);

  if v_role_key = 'admin' then
    return true;
  end if;

  select up.effect into v_override
  from public.user_permissions up
  join public.permissions p on p.id = up.permission_id
  where up.user_id = p_user_id and p.key = p_permission_key
  limit 1;

  if v_override = 'deny' then
    return false;
  end if;
  if v_override = 'allow' then
    return true;
  end if;

  return public.rbac_role_has_permission(v_role_key, p_permission_key);
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
  v_perm_key text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return false;
  end if;

  v_role_key := public.rbac_role_for_user(v_uid);

  if v_role_key = 'admin' then
    return true;
  end if;

  if v_role_key = 'cliente' then
    return p_op = 'read' and coalesce(p_module, '') = 'lavorazioni';
  end if;

  if not public.rbac_is_valid_erp_module(p_module) then
    return false;
  end if;

  v_perm_key := p_module || '.' || p_op;
  return public.rbac_user_effective_permission(v_uid, v_perm_key);
end;
$$;

create or replace function public.rbac_has_capability(p_user_id uuid, p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_user_effective_permission(p_user_id, p_capability);
$$;

drop function if exists public.security_set_user_role(uuid, public.ruolo_utente);

create or replace function public.security_set_user_role(
  p_user_id uuid,
  p_role_key text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
begin
  if p_user_id is null then
    raise exception 'security_set_user_role: user_id required';
  end if;
  if p_role_key is null or p_role_key = '' then
    raise exception 'security_set_user_role: role_key required';
  end if;

  select id into v_role_id from public.roles where key = p_role_key and is_active;
  if v_role_id is null then
    raise exception 'security_set_user_role: unknown role %', p_role_key;
  end if;

  perform set_config('app.security_set_user_role', '1', true);

  delete from public.user_permissions where user_id = p_user_id;

  update public.profiles set role_key = p_role_key where id = p_user_id;
  if not found then
    raise exception 'security_set_user_role: profile not found %', p_user_id;
  end if;

  insert into public.user_roles (user_id, role_id)
  values (p_user_id, v_role_id)
  on conflict (user_id) do update set role_id = excluded.role_id;
end;
$$;

create or replace function public.trg_profiles_role_key_guard()
returns trigger
language plpgsql
as $$
begin
  if old.role_key is distinct from new.role_key then
    if coalesce(current_setting('app.security_set_user_role', true), '') <> '1' then
      raise exception 'profiles.role_key is immutable except via RPC';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_key_guard on public.profiles;
create trigger trg_profiles_role_key_guard
  before update of role_key on public.profiles
  for each row execute function public.trg_profiles_role_key_guard();

revoke all on function public.security_set_user_role(uuid, text) from public;
grant execute on function public.security_set_user_role(uuid, text) to service_role;

revoke all on function public.rbac_role_has_permission(text, text) from public;
revoke all on function public.rbac_user_effective_permission(uuid, text) from public;
grant execute on function public.rbac_role_has_permission(text, text) to authenticated;
grant execute on function public.rbac_user_effective_permission(uuid, text) to authenticated;

-- =============================================================================
-- 8. RLS
-- =============================================================================

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_permissions enable row level security;

drop policy if exists roles_select_auth on public.roles;
create policy roles_select_auth on public.roles for select to authenticated using (true);

drop policy if exists roles_write_security on public.roles;
create policy roles_write_security on public.roles for all to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

drop policy if exists permissions_select_auth on public.permissions;
create policy permissions_select_auth on public.permissions for select to authenticated using (true);

drop policy if exists permissions_write_security on public.permissions;
create policy permissions_write_security on public.permissions for all to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

drop policy if exists role_permissions_select_auth on public.role_permissions;
create policy role_permissions_select_auth on public.role_permissions for select to authenticated using (true);

drop policy if exists role_permissions_write_security on public.role_permissions;
create policy role_permissions_write_security on public.role_permissions for all to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

drop policy if exists user_roles_select_own_or_security on public.user_roles;
create policy user_roles_select_own_or_security on public.user_roles for select to authenticated
using (
  user_id = auth.uid()
  or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
);

drop policy if exists user_roles_write_security on public.user_roles;
create policy user_roles_write_security on public.user_roles for all to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

drop policy if exists user_permissions_select_own_or_admin on public.user_permissions;
create policy user_permissions_select_own_or_admin on public.user_permissions for select to authenticated
using (
  user_id = auth.uid()
  or public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security')
);

drop policy if exists user_permissions_write_admin on public.user_permissions;
create policy user_permissions_write_admin on public.user_permissions for all to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_security'));

grant select on public.roles, public.permissions, public.role_permissions, public.user_roles to authenticated;
grant insert, update, delete on public.roles, public.permissions, public.role_permissions, public.user_roles to authenticated;
grant select, insert, update, delete on public.user_permissions to authenticated;

-- handle_new_user
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
  v_role_key text := 'operatore';
  v_role_id uuid;
  v_base text;
  v_candidate text;
  v_n int;
begin
  v_app_nome := nullif(trim(coalesce(new.raw_app_meta_data->>'cab_nome', '')), '');
  v_nome := coalesce(v_app_nome, nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''), 'utente');

  v_app_ruolo := lower(nullif(trim(coalesce(new.raw_app_meta_data->>'cab_ruolo', '')), ''));
  v_role_key := public.rbac_normalize_role(v_app_ruolo);
  if v_role_key = '' or not exists (select 1 from public.roles where key = v_role_key and is_active) then
    v_role_key := 'operatore';
  end if;

  v_app_username := lower(trim(coalesce(new.raw_app_meta_data->>'cab_username', '')));
  if v_app_username <> '' and v_app_username ~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$' and char_length(v_app_username) between 3 and 32 then
    v_username := v_app_username;
  else
    v_base := regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9._-]', '', 'g');
    v_base := trim(both '._-' from v_base);
    if v_base is null or char_length(v_base) < 3 then v_base := 'utente'; end if;
    if char_length(v_base) > 32 then v_base := left(v_base, 32); end if;
    v_candidate := v_base;
    v_n := 1;
    while exists (select 1 from public.profiles p2 where lower(p2.username) = lower(v_candidate)) loop
      v_n := v_n + 1;
      v_candidate := left(v_base, greatest(3, 32 - char_length(v_n::text) - 1)) || v_n::text;
    end loop;
    v_username := v_candidate;
  end if;

  insert into public.profiles (id, nome, role_key, username)
  values (new.id, v_nome, v_role_key, v_username)
  on conflict (id) do update
    set nome = excluded.nome,
        role_key = coalesce(public.profiles.role_key, excluded.role_key),
        username = coalesce(public.profiles.username, excluded.username);

  select id into v_role_id from public.roles where key = v_role_key;
  if v_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, v_role_id)
    on conflict (user_id) do update set role_id = excluded.role_id;
  end if;

  return new;
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
  if v_role is null or v_role = '' then return false; end if;
  if p_op = 'read' then return v_role in ('admin', 'manager', 'guest'); end if;
  if p_op in ('write', 'delete') then return v_role in ('admin', 'manager'); end if;
  return false;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.roles;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.role_permissions;
exception when duplicate_object then null;
end $$;
