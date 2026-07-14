-- Inventory Identification Layer: QR tokens, scans, label events, artifacts, bulk jobs

begin;

-- ---------------------------------------------------------------------------
-- inventory_qr_tokens
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  entity_type text not null,
  entity_id uuid not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  superseded_by uuid references public.inventory_qr_tokens (id) on delete set null,
  constraint inventory_qr_tokens_status_chk check (status in ('active', 'revoked', 'expired')),
  constraint inventory_qr_tokens_token_len_chk check (char_length(trim(token)) between 8 and 32)
);

create unique index if not exists idx_inventory_qr_token on public.inventory_qr_tokens (token);
create index if not exists idx_inventory_qr_entity on public.inventory_qr_tokens (entity_type, entity_id);
create unique index if not exists idx_inventory_qr_active_entity
  on public.inventory_qr_tokens (entity_type, entity_id)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- inventory_qr_scans
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_qr_scans (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.inventory_qr_tokens (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  user_id uuid references public.profiles (id) on delete set null,
  device text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint inventory_qr_scans_payload_obj_chk check (jsonb_typeof(payload) = 'object')
);

create index if not exists idx_inventory_scan_date on public.inventory_qr_scans (created_at desc);
create index if not exists idx_inventory_scan_entity
  on public.inventory_qr_scans (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- inventory_label_events
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_label_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  user_id uuid references public.profiles (id) on delete set null,
  device text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint inventory_label_events_payload_obj_chk check (jsonb_typeof(payload) = 'object')
);

create index if not exists idx_inventory_label_events_entity
  on public.inventory_label_events (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- inventory_label_artifacts
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_label_artifacts (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  hash text not null,
  format text not null,
  preset text not null,
  template_id text not null,
  storage_path text not null,
  generator_version text not null,
  template_version text not null,
  created_at timestamptz not null default now(),
  constraint inventory_label_artifacts_format_chk check (format in ('png', 'svg', 'pdf')),
  constraint inventory_label_artifacts_hash_len_chk check (char_length(trim(hash)) >= 8)
);

create unique index if not exists idx_inventory_label_artifact_hash
  on public.inventory_label_artifacts (entity_type, entity_id, hash, format);

-- ---------------------------------------------------------------------------
-- label_generation_jobs
-- ---------------------------------------------------------------------------

create table if not exists public.label_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  entity_ids uuid[] not null,
  preset text not null,
  format text not null default 'pdf',
  result_storage_path text,
  error text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint label_generation_jobs_status_chk check (
    status in ('pending', 'running', 'completed', 'failed')
  ),
  constraint label_generation_jobs_entity_ids_len_chk check (cardinality(entity_ids) between 1 and 1000)
);

create index if not exists idx_label_generation_jobs_created_by
  on public.label_generation_jobs (created_by, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.inventory_qr_tokens enable row level security;
alter table public.inventory_qr_scans enable row level security;
alter table public.inventory_label_events enable row level security;
alter table public.inventory_label_artifacts enable row level security;
alter table public.label_generation_jobs enable row level security;

drop policy if exists cap_inventory_qr_tokens_select on public.inventory_qr_tokens;
create policy cap_inventory_qr_tokens_select on public.inventory_qr_tokens
for select to authenticated
using (public.rbac_module_can('magazzino', 'read'));

drop policy if exists cap_inventory_qr_tokens_insert on public.inventory_qr_tokens;
create policy cap_inventory_qr_tokens_insert on public.inventory_qr_tokens
for insert to authenticated
with check (public.rbac_module_can('magazzino', 'write'));

drop policy if exists cap_inventory_qr_tokens_update on public.inventory_qr_tokens;
create policy cap_inventory_qr_tokens_update on public.inventory_qr_tokens
for update to authenticated
using (public.rbac_module_can('magazzino', 'write'))
with check (public.rbac_module_can('magazzino', 'write'));

drop policy if exists cap_inventory_qr_scans_select on public.inventory_qr_scans;
create policy cap_inventory_qr_scans_select on public.inventory_qr_scans
for select to authenticated
using (public.rbac_module_can('magazzino', 'read'));

drop policy if exists cap_inventory_qr_scans_insert on public.inventory_qr_scans;
create policy cap_inventory_qr_scans_insert on public.inventory_qr_scans
for insert to authenticated
with check (public.rbac_module_can('magazzino', 'read'));

drop policy if exists cap_inventory_label_events_select on public.inventory_label_events;
create policy cap_inventory_label_events_select on public.inventory_label_events
for select to authenticated
using (public.rbac_module_can('magazzino', 'read'));

drop policy if exists cap_inventory_label_events_insert on public.inventory_label_events;
create policy cap_inventory_label_events_insert on public.inventory_label_events
for insert to authenticated
with check (public.rbac_module_can('magazzino', 'read'));

drop policy if exists cap_inventory_label_artifacts_select on public.inventory_label_artifacts;
create policy cap_inventory_label_artifacts_select on public.inventory_label_artifacts
for select to authenticated
using (public.rbac_module_can('magazzino', 'read'));

drop policy if exists cap_inventory_label_artifacts_insert on public.inventory_label_artifacts;
create policy cap_inventory_label_artifacts_insert on public.inventory_label_artifacts
for insert to authenticated
with check (public.rbac_module_can('magazzino', 'write'));

drop policy if exists cap_label_generation_jobs_select on public.label_generation_jobs;
create policy cap_label_generation_jobs_select on public.label_generation_jobs
for select to authenticated
using (
  public.rbac_module_can('magazzino', 'read')
  and (created_by = auth.uid() or public.rbac_normalized_role() = 'admin')
);

drop policy if exists cap_label_generation_jobs_insert on public.label_generation_jobs;
create policy cap_label_generation_jobs_insert on public.label_generation_jobs
for insert to authenticated
with check (public.rbac_module_can('magazzino', 'write'));

drop policy if exists cap_label_generation_jobs_update on public.label_generation_jobs;
create policy cap_label_generation_jobs_update on public.label_generation_jobs
for update to authenticated
using (public.rbac_module_can('magazzino', 'write'))
with check (public.rbac_module_can('magazzino', 'write'));

grant select, insert, update on public.inventory_qr_tokens to authenticated;
grant select, insert on public.inventory_qr_scans to authenticated;
grant select, insert on public.inventory_label_events to authenticated;
grant select, insert on public.inventory_label_artifacts to authenticated;
grant select, insert, update on public.label_generation_jobs to authenticated;

commit;
