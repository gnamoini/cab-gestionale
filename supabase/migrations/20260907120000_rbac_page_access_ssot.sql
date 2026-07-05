-- RBAC page-based SSOT: role_page_access + user_page_overrides.
-- role_permissions / user_permissions / permissions = legacy RLS only (not written by app).

create table if not exists public.role_page_access (
  role_id uuid not null references public.roles (id) on delete cascade,
  page_key text not null,
  access_level text not null check (access_level in ('write', 'read', 'none')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role_id, page_key)
);

create table if not exists public.user_page_overrides (
  user_id uuid not null references public.profiles (id) on delete cascade,
  page_key text not null,
  access_level text not null check (access_level in ('write', 'read', 'none')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, page_key)
);

create index if not exists role_page_access_page_key_idx on public.role_page_access (page_key);
create index if not exists user_page_overrides_page_key_idx on public.user_page_overrides (page_key);

-- Mapping modulo ERP → pagina (bridge RLS temporaneo, allineato a gestionale-pages.ts)
create table if not exists public.rbac_page_module_expansion (
  page_key text not null,
  module text not null,
  primary key (page_key, module)
);

insert into public.rbac_page_module_expansion (page_key, module) values
  ('lavorazioni', 'lavorazioni'),
  ('preventivi', 'preventivi'),
  ('preventivi', 'ddt'),
  ('preventivi', 'ordini_fornitori'),
  ('fatturazione', 'fatturazione'),
  ('documenti', 'documenti'),
  ('documenti', 'document_capture'),
  ('magazzino', 'magazzino'),
  ('mezzi', 'mezzi'),
  ('dipendenti', 'dipendenti'),
  ('report', 'report')
on conflict do nothing;

-- Seed role_page_access da matrice canonica (allineata a lib/rbac-page-seed.ts)
insert into public.role_page_access (role_id, page_key, access_level)
select r.id, v.page_key, v.access_level
from public.roles r
cross join (
  values
    ('admin', 'dashboard', 'write'),
    ('admin', 'agenda', 'write'),
    ('admin', 'lavorazioni', 'write'),
    ('admin', 'lavorazioni_clienti', 'write'),
    ('admin', 'preventivi', 'write'),
    ('admin', 'fatturazione', 'write'),
    ('admin', 'documenti', 'write'),
    ('admin', 'magazzino', 'write'),
    ('admin', 'mezzi', 'write'),
    ('admin', 'dipendenti', 'write'),
    ('admin', 'report', 'write'),
    ('admin', 'impostazioni', 'write'),
    ('admin', 'sicurezza', 'write'),
    ('manager', 'dashboard', 'write'),
    ('manager', 'agenda', 'write'),
    ('manager', 'lavorazioni', 'write'),
    ('manager', 'lavorazioni_clienti', 'none'),
    ('manager', 'preventivi', 'write'),
    ('manager', 'fatturazione', 'write'),
    ('manager', 'documenti', 'write'),
    ('manager', 'magazzino', 'write'),
    ('manager', 'mezzi', 'write'),
    ('manager', 'dipendenti', 'write'),
    ('manager', 'report', 'write'),
    ('manager', 'impostazioni', 'write'),
    ('manager', 'sicurezza', 'none'),
    ('operatore', 'dashboard', 'write'),
    ('operatore', 'agenda', 'write'),
    ('operatore', 'lavorazioni', 'write'),
    ('operatore', 'lavorazioni_clienti', 'none'),
    ('operatore', 'preventivi', 'none'),
    ('operatore', 'fatturazione', 'none'),
    ('operatore', 'documenti', 'write'),
    ('operatore', 'magazzino', 'write'),
    ('operatore', 'mezzi', 'write'),
    ('operatore', 'dipendenti', 'none'),
    ('operatore', 'report', 'none'),
    ('operatore', 'impostazioni', 'none'),
    ('operatore', 'sicurezza', 'none'),
    ('addetto_amministrativo', 'dashboard', 'write'),
    ('addetto_amministrativo', 'agenda', 'write'),
    ('addetto_amministrativo', 'lavorazioni', 'none'),
    ('addetto_amministrativo', 'lavorazioni_clienti', 'none'),
    ('addetto_amministrativo', 'preventivi', 'write'),
    ('addetto_amministrativo', 'fatturazione', 'write'),
    ('addetto_amministrativo', 'documenti', 'none'),
    ('addetto_amministrativo', 'magazzino', 'none'),
    ('addetto_amministrativo', 'mezzi', 'none'),
    ('addetto_amministrativo', 'dipendenti', 'none'),
    ('addetto_amministrativo', 'report', 'write'),
    ('addetto_amministrativo', 'impostazioni', 'none'),
    ('addetto_amministrativo', 'sicurezza', 'none'),
    ('guest', 'dashboard', 'read'),
    ('guest', 'agenda', 'read'),
    ('guest', 'lavorazioni', 'none'),
    ('guest', 'lavorazioni_clienti', 'none'),
    ('guest', 'preventivi', 'read'),
    ('guest', 'fatturazione', 'none'),
    ('guest', 'documenti', 'read'),
    ('guest', 'magazzino', 'read'),
    ('guest', 'mezzi', 'read'),
    ('guest', 'dipendenti', 'read'),
    ('guest', 'report', 'read'),
    ('guest', 'impostazioni', 'none'),
    ('guest', 'sicurezza', 'none'),
    ('cliente', 'dashboard', 'none'),
    ('cliente', 'agenda', 'none'),
    ('cliente', 'lavorazioni', 'none'),
    ('cliente', 'lavorazioni_clienti', 'read'),
    ('cliente', 'preventivi', 'none'),
    ('cliente', 'fatturazione', 'none'),
    ('cliente', 'documenti', 'none'),
    ('cliente', 'magazzino', 'none'),
    ('cliente', 'mezzi', 'none'),
    ('cliente', 'dipendenti', 'none'),
    ('cliente', 'report', 'none'),
    ('cliente', 'impostazioni', 'none'),
    ('cliente', 'sicurezza', 'none')
) as v(role_key, page_key, access_level)
where r.key = v.role_key
on conflict (role_id, page_key) do update set
  access_level = excluded.access_level,
  updated_at = now();

-- Livello effettivo pagina per utente (admin bypass, override, ruolo, default none)
create or replace function public.rbac_user_page_access_level(p_user_id uuid, p_page_key text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role_key text;
  v_override text;
  v_role_level text;
begin
  if p_user_id is null or p_page_key is null or p_page_key = '' then
    return 'none';
  end if;

  v_role_key := public.rbac_role_for_user(p_user_id);
  if v_role_key = 'admin' then
    return 'write';
  end if;

  select upo.access_level into v_override
  from public.user_page_overrides upo
  where upo.user_id = p_user_id and upo.page_key = p_page_key
  limit 1;

  if v_override is not null then
    return v_override;
  end if;

  select rpa.access_level into v_role_level
  from public.role_page_access rpa
  join public.roles r on r.id = rpa.role_id and r.is_active
  where r.key = v_role_key and rpa.page_key = p_page_key
  limit 1;

  return coalesce(v_role_level, 'none');
end;
$$;

-- Modulo ERP: true se almeno una pagina che espande il modulo concede l'op
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
begin
  if p_user_id is null or p_module is null or p_module = '' then
    return false;
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

-- Sostituisce user_effective_can per moduli ERP (page SSOT)
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
  v_uid := auth.uid();
  if v_uid is null then
    return false;
  end if;

  v_role_key := public.rbac_role_for_user(v_uid);
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

revoke all on function public.rbac_user_page_access_level(uuid, text) from public;
grant execute on function public.rbac_user_page_access_level(uuid, text) to authenticated;
revoke all on function public.rbac_module_from_page_access(uuid, text, text) from public;
grant execute on function public.rbac_module_from_page_access(uuid, text, text) to authenticated;
