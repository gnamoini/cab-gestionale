-- UnoERP integration: mappings, document links, outbox, audit. Server-only writes.
-- No DELETE/cancel RPCs. No GRANT EXECUTE TO anon.

begin;

create table if not exists public.unoerp_customer_mappings (
  id uuid primary key default gen_random_uuid(),
  cab_customer_id uuid not null references public.clienti_anagrafiche (id) on delete restrict,
  unoerp_customer_id text not null,
  matched_by text not null,
  matched_at timestamptz not null default now(),
  last_verified_at timestamptz,
  status text not null default 'active',
  unoerp_vat text,
  unoerp_tax_id text,
  unoerp_customer_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unoerp_customer_mappings_status_chk check (status in ('active', 'blocked', 'manual_review')),
  constraint unoerp_customer_mappings_matched_by_chk check (
    matched_by in ('mapping', 'partita_iva', 'codice_fiscale', 'codice_cliente', 'manual')
  )
);

create unique index if not exists unoerp_customer_mappings_cab_active_uq
  on public.unoerp_customer_mappings (cab_customer_id)
  where status = 'active';

create unique index if not exists unoerp_customer_mappings_pair_uq
  on public.unoerp_customer_mappings (cab_customer_id, unoerp_customer_id);

create table if not exists public.unoerp_item_mappings (
  id uuid primary key default gen_random_uuid(),
  cab_item_id uuid not null,
  unoerp_item_id text not null,
  cab_code text,
  matched_by text not null default 'manual',
  verified_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unoerp_item_mappings_status_chk check (status in ('active', 'blocked', 'manual_review'))
);

create unique index if not exists unoerp_item_mappings_cab_active_uq
  on public.unoerp_item_mappings (cab_item_id)
  where status = 'active';

create table if not exists public.unoerp_service_mappings (
  id uuid primary key default gen_random_uuid(),
  cab_service_key text not null,
  unoerp_item_id text not null,
  matched_by text not null default 'manual',
  verified_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unoerp_service_mappings_status_chk check (status in ('active', 'blocked', 'manual_review'))
);

create unique index if not exists unoerp_service_mappings_key_active_uq
  on public.unoerp_service_mappings (cab_service_key)
  where status = 'active';

create table if not exists public.unoerp_document_links (
  id uuid primary key default gen_random_uuid(),
  cab_document_id uuid not null,
  cab_document_type text not null,
  unoerp_module text not null,
  unoerp_file text not null,
  unoerp_record_id text not null,
  unoerp_document_number text,
  sync_status text not null default 'PENDING',
  last_synced_source_version bigint,
  last_synced_hash text,
  last_synced_at timestamptz,
  last_error_code text,
  last_error_message text,
  customer_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unoerp_document_links_type_chk check (cab_document_type in ('preventivo', 'consuntivo', 'ddt')),
  constraint unoerp_document_links_snapshot_obj_chk check (jsonb_typeof(customer_snapshot) = 'object')
);

create unique index if not exists unoerp_document_links_cab_uq
  on public.unoerp_document_links (cab_document_id, cab_document_type);

create unique index if not exists unoerp_document_links_unoerp_uq
  on public.unoerp_document_links (unoerp_module, unoerp_file, unoerp_record_id);

create table if not exists public.unoerp_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  cab_document_id uuid not null,
  cab_document_type text not null,
  source_version bigint not null,
  payload_hash text not null,
  operation text not null,
  sync_run_id uuid not null,
  payload_snapshot jsonb not null default '{}'::jsonb,
  previous_payload_hash text,
  previous_source_version bigint,
  status text not null default 'PENDING',
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  locked_at timestamptz,
  next_attempt_at timestamptz,
  last_error text,
  last_error_code text,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unoerp_sync_jobs_op_chk check (operation in ('CREATE', 'UPDATE')),
  constraint unoerp_sync_jobs_type_chk check (cab_document_type in ('preventivo', 'consuntivo', 'ddt')),
  constraint unoerp_sync_jobs_snapshot_obj_chk check (jsonb_typeof(payload_snapshot) = 'object')
);

create unique index if not exists unoerp_sync_jobs_idem_uq
  on public.unoerp_sync_jobs (cab_document_id, cab_document_type, source_version, operation);

create index if not exists unoerp_sync_jobs_claim_idx
  on public.unoerp_sync_jobs (created_at)
  where status in ('PENDING', 'RETRYABLE_ERROR');

create table if not exists public.unoerp_sync_audit (
  id uuid primary key default gen_random_uuid(),
  cab_entity_id uuid not null,
  cab_entity_type text not null,
  unoerp_module text,
  unoerp_file text,
  unoerp_record_id text,
  operation text not null,
  result text not null,
  http_status integer,
  error_code text,
  payload_hash text,
  sync_run_id uuid,
  created_by_cab boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.unoerp_schema_fingerprints (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  file text not null,
  fingerprint text not null,
  captured_at timestamptz not null default now(),
  unique (module, file)
);

alter table public.ddt_documents
  add column if not exists source_version integer not null default 1;

create or replace function public.bump_ddt_source_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.source_version := coalesce(old.source_version, 0) + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ddt_source_version on public.ddt_documents;
create trigger trg_ddt_source_version
before update on public.ddt_documents
for each row execute function public.bump_ddt_source_version();

alter table public.unoerp_customer_mappings enable row level security;
alter table public.unoerp_item_mappings enable row level security;
alter table public.unoerp_service_mappings enable row level security;
alter table public.unoerp_document_links enable row level security;
alter table public.unoerp_sync_jobs enable row level security;
alter table public.unoerp_sync_audit enable row level security;
alter table public.unoerp_schema_fingerprints enable row level security;

revoke all on public.unoerp_customer_mappings from public, anon, authenticated;
revoke all on public.unoerp_item_mappings from public, anon, authenticated;
revoke all on public.unoerp_service_mappings from public, anon, authenticated;
revoke all on public.unoerp_document_links from public, anon, authenticated;
revoke all on public.unoerp_sync_jobs from public, anon, authenticated;
revoke all on public.unoerp_sync_audit from public, anon, authenticated;
revoke all on public.unoerp_schema_fingerprints from public, anon, authenticated;

grant select on public.unoerp_document_links to authenticated;
grant select on public.unoerp_customer_mappings to authenticated;

drop policy if exists unoerp_document_links_select on public.unoerp_document_links;
create policy unoerp_document_links_select on public.unoerp_document_links
for select to authenticated
using (
  public.rbac_module_can('preventivi', 'read')
  or public.rbac_module_can('ddt', 'read')
);

drop policy if exists unoerp_customer_mappings_select on public.unoerp_customer_mappings;
create policy unoerp_customer_mappings_select on public.unoerp_customer_mappings
for select to authenticated
using (public.rbac_module_can('preventivi', 'read'));

comment on table public.unoerp_sync_jobs is 'UnoERP outbox. CREATE/UPDATE only. No delete operations.';
comment on table public.unoerp_document_links is 'Ownership CAB→UnoERP. UPDATE only with matching link.';

commit;
