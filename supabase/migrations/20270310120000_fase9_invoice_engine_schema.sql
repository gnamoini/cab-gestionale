-- FASE 9 — Invoice Engine schema: XML documents, transmissions, SDI events, state history.
begin;

-- ---------------------------------------------------------------------------
-- XML schema versions (audit trail for XSD used)
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_xml_schema_versions (
  id uuid primary key default gen_random_uuid(),
  schema_version text not null,
  specification_version text not null,
  namespace text not null,
  root_format text not null default 'FPR12',
  xsd_path text not null,
  xsd_sha256 text,
  active_from date not null,
  active_to date,
  created_at timestamptz not null default now(),
  constraint invoice_xml_schema_versions_version_uq unique (schema_version)
);

alter table public.invoice_xml_schema_versions enable row level security;

drop policy if exists cap_invoice_xml_schema_versions_select on public.invoice_xml_schema_versions;
create policy cap_invoice_xml_schema_versions_select on public.invoice_xml_schema_versions
for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

grant select on public.invoice_xml_schema_versions to authenticated;
grant select, insert, update on public.invoice_xml_schema_versions to service_role;

insert into public.invoice_xml_schema_versions (
  schema_version, specification_version, namespace, root_format, xsd_path, active_from
)
values (
  'FPR12-v1.2.2', '1.2.2',
  'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2',
  'FPR12',
  'docs/fatturapa/xsd/Schema_del_file_xml_FatturaPA_versione_1.2.2.xsd',
  '2020-01-01'::date
)
on conflict (schema_version) do nothing;

-- ---------------------------------------------------------------------------
-- XML documents (immutable blob + hash)
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_xml_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  transmission_id uuid,
  xml_content text not null,
  xml_sha256 text not null,
  schema_version text not null,
  generator_version text not null default 'fase9-1.0',
  version integer not null default 1,
  generated_at timestamptz not null default now(),
  generated_by uuid,
  constraint invoice_xml_documents_sha_uq unique (invoice_id, xml_sha256)
);

create index if not exists idx_invoice_xml_documents_invoice on public.invoice_xml_documents (invoice_id);

alter table public.invoice_xml_documents enable row level security;

drop policy if exists cap_invoice_xml_documents_select on public.invoice_xml_documents;
create policy cap_invoice_xml_documents_select on public.invoice_xml_documents
for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_invoice_xml_documents_write on public.invoice_xml_documents;
create policy cap_invoice_xml_documents_write on public.invoice_xml_documents
for all to authenticated
using (public.rbac_module_can('fatturazione', 'sdi_admin'))
with check (public.rbac_module_can('fatturazione', 'sdi_admin'));

grant select on public.invoice_xml_documents to authenticated;
grant select, insert on public.invoice_xml_documents to service_role;

create or replace function public.invoice_guard_xml_document_append_only()
returns trigger language plpgsql set search_path = public as $$
begin raise exception 'invoice_xml_document_immutable'; end;
$$;

drop trigger if exists trg_invoice_xml_document_append_only on public.invoice_xml_documents;
create trigger trg_invoice_xml_document_append_only
before update or delete on public.invoice_xml_documents
for each row execute function public.invoice_guard_xml_document_append_only();

-- ---------------------------------------------------------------------------
-- Transmissions (transport layer — separate from SdI outcome)
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_transmissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  attempt_number integer not null,
  xml_document_id uuid references public.invoice_xml_documents (id) on delete set null,
  xml_hash text,
  transport_provider text not null default 'simulator',
  transport_status text not null default 'queued',
  provider_request_id text,
  sdi_identifier text,
  submitted_at timestamptz,
  accepted_at timestamptz,
  last_event_at timestamptz,
  error_code text,
  error_message text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_transmissions_status_chk check (
    transport_status in (
      'queued', 'processing', 'provider_accepted', 'provider_error',
      'pending_reconciliation', 'failed', 'synced'
    )
  ),
  constraint invoice_transmissions_attempt_uq unique (invoice_id, attempt_number),
  constraint invoice_transmissions_idempotency_uq unique (idempotency_key)
);

create index if not exists idx_invoice_transmissions_invoice on public.invoice_transmissions (invoice_id);
create index if not exists idx_invoice_transmissions_reconciliation
  on public.invoice_transmissions (transport_status)
  where transport_status = 'pending_reconciliation';

alter table public.invoice_transmissions enable row level security;

drop policy if exists cap_invoice_transmissions_select on public.invoice_transmissions;
create policy cap_invoice_transmissions_select on public.invoice_transmissions
for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_invoice_transmissions_write on public.invoice_transmissions;
create policy cap_invoice_transmissions_write on public.invoice_transmissions
for all to authenticated
using (public.rbac_module_can('fatturazione', 'sdi_admin'))
with check (public.rbac_module_can('fatturazione', 'sdi_admin'));

grant select on public.invoice_transmissions to authenticated;
grant select, insert, update on public.invoice_transmissions to service_role;

drop trigger if exists trg_invoice_transmissions_updated_at on public.invoice_transmissions;
create trigger trg_invoice_transmissions_updated_at
before update on public.invoice_transmissions
for each row execute function public.set_updated_at();

-- FK from xml_documents to transmissions (deferred)
alter table public.invoice_xml_documents
  drop constraint if exists invoice_xml_documents_transmission_id_fkey;
alter table public.invoice_xml_documents
  add constraint invoice_xml_documents_transmission_id_fkey
  foreign key (transmission_id) references public.invoice_transmissions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- SDI events (append-only, canonical + raw codes)
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_sdi_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  transmission_id uuid references public.invoice_transmissions (id) on delete set null,
  canonical_event_type text not null,
  raw_sdi_event_code text,
  provider_event_id text,
  sdi_identifier text,
  received_at timestamptz not null default now(),
  event_payload jsonb not null default '{}'::jsonb,
  payload_hash text not null,
  parsed_code text,
  parsed_message text,
  idempotency_key text not null,
  constraint invoice_sdi_events_canonical_chk check (
    canonical_event_type in (
      'SUBMITTED', 'DELIVERY', 'DELIVERY_UNAVAILABLE', 'REJECTED',
      'TECHNICAL_RECEIPT', 'UNKNOWN'
    )
  ),
  constraint invoice_sdi_events_idempotency_uq unique (idempotency_key)
);

create index if not exists idx_invoice_sdi_events_invoice on public.invoice_sdi_events (invoice_id);
create index if not exists idx_invoice_sdi_events_transmission on public.invoice_sdi_events (transmission_id);

alter table public.invoice_sdi_events enable row level security;

drop policy if exists cap_invoice_sdi_events_select on public.invoice_sdi_events;
create policy cap_invoice_sdi_events_select on public.invoice_sdi_events
for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

revoke all on public.invoice_sdi_events from public, anon;
grant select on public.invoice_sdi_events to authenticated;
grant select, insert on public.invoice_sdi_events to service_role;

create or replace function public.invoice_guard_sdi_event_append_only()
returns trigger language plpgsql set search_path = public as $$
begin raise exception 'invoice_sdi_event_immutable'; end;
$$;

drop trigger if exists trg_invoice_sdi_event_append_only on public.invoice_sdi_events;
create trigger trg_invoice_sdi_event_append_only
before update or delete on public.invoice_sdi_events
for each row execute function public.invoice_guard_sdi_event_append_only();

-- ---------------------------------------------------------------------------
-- State history (immutable axis transitions)
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_state_history (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  event_at timestamptz not null default now(),
  actor_id uuid,
  event_code text not null,
  from_axes jsonb not null default '{}'::jsonb,
  to_axes jsonb not null default '{}'::jsonb,
  reference_type text,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_invoice_state_history_invoice on public.invoice_state_history (invoice_id, event_at);

alter table public.invoice_state_history enable row level security;

drop policy if exists cap_invoice_state_history_select on public.invoice_state_history;
create policy cap_invoice_state_history_select on public.invoice_state_history
for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

revoke all on public.invoice_state_history from public, anon;
grant select on public.invoice_state_history to authenticated;
grant select, insert on public.invoice_state_history to service_role;

create or replace function public.invoice_guard_state_history_append_only()
returns trigger language plpgsql set search_path = public as $$
begin raise exception 'invoice_state_history_immutable'; end;
$$;

drop trigger if exists trg_invoice_state_history_append_only on public.invoice_state_history;
create trigger trg_invoice_state_history_append_only
before update or delete on public.invoice_state_history
for each row execute function public.invoice_guard_state_history_append_only();

-- ---------------------------------------------------------------------------
-- Extend existing tables
-- ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists xml_schema_version text;

alter table public.invoice_fatturapa_snapshots
  add column if not exists xml_document_id uuid references public.invoice_xml_documents (id) on delete set null;

alter table public.invoice_sdi_jobs
  add column if not exists transmission_id uuid references public.invoice_transmissions (id) on delete set null;

alter table public.invoice_sdi_jobs drop constraint if exists invoice_sdi_jobs_status_chk;
alter table public.invoice_sdi_jobs add constraint invoice_sdi_jobs_status_chk check (
  status in (
    'PENDING', 'PROCESSING', 'SUBMITTED', 'SYNCED', 'RETRY',
    'FAILED', 'BLOCKED', 'PENDING_RECONCILIATION'
  )
);

-- ---------------------------------------------------------------------------
-- Legacy invoice_sdi_submissions — read-only compatibility
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.invoice_sdi_submissions from authenticated, service_role;
grant select on public.invoice_sdi_submissions to authenticated;

create or replace view public.v_invoice_sdi_submissions_legacy as
select * from public.invoice_sdi_submissions;

comment on view public.v_invoice_sdi_submissions_legacy is
  'FASE 9 — read-only compatibility view. Use invoice_transmissions for new writes.';

-- ---------------------------------------------------------------------------
-- Notification types for FASE 9
-- ---------------------------------------------------------------------------
insert into public.notification_type_registry (
  type, allowed_scope_type, allowed_scope_value, allowed_scope_module, default_priority, caller_min_role
)
values
  ('fattura_transmission_blocked', 'role', 'addetto_amministrativo', 'fatturazione', 'high', 'staff'),
  ('fattura_reconciliation_required', 'role', 'addetto_amministrativo', 'fatturazione', 'high', 'staff')
on conflict (type) do nothing;

commit;

notify pgrst, 'reload schema';
