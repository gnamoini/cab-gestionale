-- Anagrafica clienti estesa (dati fiscali, sedi, contatti) — isolata da picker mezzi:clienti.

create table if not exists public.clienti_anagrafiche (
  id uuid primary key default gen_random_uuid(),
  nome_display text not null,
  entity_key text not null,
  ragione_sociale text,
  partita_iva text,
  codice_destinatario text,
  sede_legale_uguale_operativa boolean not null default false,
  in_lista_settings boolean not null default true,
  note text,
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_clienti_anagrafiche_entity_key
  on public.clienti_anagrafiche (entity_key);

create index if not exists idx_clienti_anagrafiche_nome_display_norm
  on public.clienti_anagrafiche (lower(trim(nome_display)));

create index if not exists idx_clienti_anagrafiche_in_lista_settings
  on public.clienti_anagrafiche (in_lista_settings, nome_display);

comment on table public.clienti_anagrafiche is
  'Anagrafica estesa clienti commerciali; nome_display allineato a app_settings mezzi/liste clienti[].';

create table if not exists public.clienti_sedi (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clienti_anagrafiche (id) on delete cascade,
  tipo text not null check (tipo in ('operativa', 'legale')),
  via text,
  numero_civico text,
  cap text,
  citta text,
  provincia text,
  stato text not null default 'IT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, tipo)
);

create index if not exists idx_clienti_sedi_cliente_id on public.clienti_sedi (cliente_id);

comment on table public.clienti_sedi is 'Sede operativa / legale per anagrafica cliente.';

create table if not exists public.clienti_contatti (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clienti_anagrafiche (id) on delete cascade,
  etichetta text not null,
  tipo text not null check (tipo in (
    'email', 'pec', 'cellulare', 'telefono', 'whatsapp', 'sito_web', 'altro'
  )),
  valore text not null,
  ordine int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clienti_contatti_cliente_ordine
  on public.clienti_contatti (cliente_id, ordine);

comment on table public.clienti_contatti is 'Rubrica contatti flessibile per anagrafica cliente.';

drop trigger if exists trg_clienti_anagrafiche_updated_at on public.clienti_anagrafiche;
create trigger trg_clienti_anagrafiche_updated_at
before update on public.clienti_anagrafiche
for each row execute function public.set_updated_at();

drop trigger if exists trg_clienti_sedi_updated_at on public.clienti_sedi;
create trigger trg_clienti_sedi_updated_at
before update on public.clienti_sedi
for each row execute function public.set_updated_at();

drop trigger if exists trg_clienti_contatti_updated_at on public.clienti_contatti;
create trigger trg_clienti_contatti_updated_at
before update on public.clienti_contatti
for each row execute function public.set_updated_at();

alter table public.clienti_anagrafiche enable row level security;
alter table public.clienti_sedi enable row level security;
alter table public.clienti_contatti enable row level security;

drop policy if exists cap_clienti_anagrafiche_select on public.clienti_anagrafiche;
create policy cap_clienti_anagrafiche_select on public.clienti_anagrafiche
for select to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

drop policy if exists cap_clienti_anagrafiche_insert on public.clienti_anagrafiche;
create policy cap_clienti_anagrafiche_insert on public.clienti_anagrafiche
for insert to authenticated
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

drop policy if exists cap_clienti_anagrafiche_update on public.clienti_anagrafiche;
create policy cap_clienti_anagrafiche_update on public.clienti_anagrafiche
for update to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

drop policy if exists cap_clienti_anagrafiche_delete on public.clienti_anagrafiche;
create policy cap_clienti_anagrafiche_delete on public.clienti_anagrafiche
for delete to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

drop policy if exists cap_clienti_sedi_select on public.clienti_sedi;
create policy cap_clienti_sedi_select on public.clienti_sedi
for select to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

drop policy if exists cap_clienti_sedi_insert on public.clienti_sedi;
create policy cap_clienti_sedi_insert on public.clienti_sedi
for insert to authenticated
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

drop policy if exists cap_clienti_sedi_update on public.clienti_sedi;
create policy cap_clienti_sedi_update on public.clienti_sedi
for update to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

drop policy if exists cap_clienti_sedi_delete on public.clienti_sedi;
create policy cap_clienti_sedi_delete on public.clienti_sedi
for delete to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

drop policy if exists cap_clienti_contatti_select on public.clienti_contatti;
create policy cap_clienti_contatti_select on public.clienti_contatti
for select to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

drop policy if exists cap_clienti_contatti_insert on public.clienti_contatti;
create policy cap_clienti_contatti_insert on public.clienti_contatti
for insert to authenticated
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

drop policy if exists cap_clienti_contatti_update on public.clienti_contatti;
create policy cap_clienti_contatti_update on public.clienti_contatti
for update to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'))
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

drop policy if exists cap_clienti_contatti_delete on public.clienti_contatti;
create policy cap_clienti_contatti_delete on public.clienti_contatti
for delete to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_manage_settings'));

revoke all on table public.clienti_anagrafiche from public;
revoke all on table public.clienti_anagrafiche from anon;
grant select, insert, update, delete on table public.clienti_anagrafiche to authenticated;

revoke all on table public.clienti_sedi from public;
revoke all on table public.clienti_sedi from anon;
grant select, insert, update, delete on table public.clienti_sedi to authenticated;

revoke all on table public.clienti_contatti from public;
revoke all on table public.clienti_contatti from anon;
grant select, insert, update, delete on table public.clienti_contatti to authenticated;

-- Seed clienti esistenti: entity_key richiede normalizzazione TS (buildClienteEntityKey).
-- Eseguire lib/clienti/clienti-anagrafica-migrate.ts con nomi da app_settings mezzi/liste.
-- Nuovi clienti: stub lazy alla prima apertura ClienteAnagraficaHubModal (ensureStub).
