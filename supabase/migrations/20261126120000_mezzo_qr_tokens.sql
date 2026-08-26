-- Mezzo QR identification layer: tokens, scans; extend inventory_label_events RLS for mezzo entity

begin;

-- ---------------------------------------------------------------------------
-- mezzo_qr_tokens
-- ---------------------------------------------------------------------------

create table if not exists public.mezzo_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  mezzo_id uuid not null references public.mezzi (id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  superseded_by uuid references public.mezzo_qr_tokens (id) on delete set null,
  constraint mezzo_qr_tokens_status_chk check (status in ('active', 'revoked', 'expired')),
  constraint mezzo_qr_tokens_token_len_chk check (char_length(trim(token)) between 8 and 32)
);

create unique index if not exists idx_mezzo_qr_token on public.mezzo_qr_tokens (token);
create index if not exists idx_mezzo_qr_mezzo_id on public.mezzo_qr_tokens (mezzo_id);
create unique index if not exists idx_mezzo_qr_active_mezzo
  on public.mezzo_qr_tokens (mezzo_id)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- mezzo_qr_scans
-- ---------------------------------------------------------------------------

create table if not exists public.mezzo_qr_scans (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.mezzo_qr_tokens (id) on delete cascade,
  mezzo_id uuid not null references public.mezzi (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  device text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint mezzo_qr_scans_payload_obj_chk check (jsonb_typeof(payload) = 'object')
);

create index if not exists idx_mezzo_qr_scan_date on public.mezzo_qr_scans (created_at desc);
create index if not exists idx_mezzo_qr_scan_mezzo
  on public.mezzo_qr_scans (mezzo_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS mezzo_qr_tokens / mezzo_qr_scans
-- ---------------------------------------------------------------------------

alter table public.mezzo_qr_tokens enable row level security;
alter table public.mezzo_qr_scans enable row level security;

drop policy if exists cap_mezzo_qr_tokens_select on public.mezzo_qr_tokens;
create policy cap_mezzo_qr_tokens_select on public.mezzo_qr_tokens
for select to authenticated
using (public.rbac_module_can('mezzi', 'read'));

drop policy if exists cap_mezzo_qr_tokens_insert on public.mezzo_qr_tokens;
create policy cap_mezzo_qr_tokens_insert on public.mezzo_qr_tokens
for insert to authenticated
with check (public.rbac_module_can('mezzi', 'write'));

drop policy if exists cap_mezzo_qr_tokens_update on public.mezzo_qr_tokens;
create policy cap_mezzo_qr_tokens_update on public.mezzo_qr_tokens
for update to authenticated
using (public.rbac_module_can('mezzi', 'write'))
with check (public.rbac_module_can('mezzi', 'write'));

drop policy if exists cap_mezzo_qr_scans_select on public.mezzo_qr_scans;
create policy cap_mezzo_qr_scans_select on public.mezzo_qr_scans
for select to authenticated
using (public.rbac_module_can('mezzi', 'read'));

drop policy if exists cap_mezzo_qr_scans_insert on public.mezzo_qr_scans;
create policy cap_mezzo_qr_scans_insert on public.mezzo_qr_scans
for insert to authenticated
with check (public.rbac_module_can('mezzi', 'read'));

grant select, insert, update on public.mezzo_qr_tokens to authenticated;
grant select, insert on public.mezzo_qr_scans to authenticated;

-- ---------------------------------------------------------------------------
-- inventory_label_events: allow mezzo entity_type via mezzi module
-- ---------------------------------------------------------------------------

drop policy if exists cap_inventory_label_events_select_mezzi on public.inventory_label_events;
create policy cap_inventory_label_events_select_mezzi on public.inventory_label_events
for select to authenticated
using (
  entity_type = 'mezzo'
  and public.rbac_module_can('mezzi', 'read')
);

drop policy if exists cap_inventory_label_events_insert_mezzi on public.inventory_label_events;
create policy cap_inventory_label_events_insert_mezzi on public.inventory_label_events
for insert to authenticated
with check (
  entity_type = 'mezzo'
  and public.rbac_module_can('mezzi', 'read')
);

commit;
