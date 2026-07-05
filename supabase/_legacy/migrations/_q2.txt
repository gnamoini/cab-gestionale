-- ---------------------------------------------------------------------------
-- document_capture
-- ---------------------------------------------------------------------------

create table if not exists public.document_capture (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  storage_path text not null,
  sha256 text,
  mime text,
  file_name text not null,
  file_size_bytes bigint,
  expected_mime text,
  storage_version text,
  storage_etag text,
  capture_version integer not null default 1,
  finalized_at timestamptz,
  duplicate_of uuid references public.document_capture (id) on delete set null,
  source text not null,
  document_category text not null default 'altro',
  scheda_tipo text,
  status text not null default 'pending_upload',
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  lavorazione_id uuid references public.lavorazioni (id) on delete set null,
  mezzo_id uuid references public.mezzi (id) on delete set null,
  attrezzatura_id uuid references public.attrezzature (id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  deletion_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_capture_scheda_tipo_chk check (
    scheda_tipo is null or document_category = 'scheda_officina'
  ),
  constraint document_capture_status_chk check (
    status in (
      'pending_upload', 'expired_upload', 'uploaded', 'review_required',
      'analyzing', 'review', 'dry_run', 'applied', 'archived', 'failed'
    )
  ),
  constraint document_capture_category_chk check (
    document_category in ('scheda_officina', 'documento_amministrativo', 'foto', 'altro')
  ),
  constraint document_capture_scheda_tipo_values_chk check (
    scheda_tipo is null or scheda_tipo in ('ingresso', 'lavorazioni', 'ricambi')
  ),
  constraint document_capture_finalized_sha_chk check (
    finalized_at is null or sha256 is not null
  ),
  constraint document_capture_deletion_reason_chk check (
    deleted_at is null or (deletion_reason is not null and char_length(trim(deletion_reason)) >= 3)
  )
);

create unique index if not exists uq_document_capture_company_sha256_finalized
  on public.document_capture (company_id, sha256)
  where deleted_at is null and finalized_at is not null and sha256 is not null;

create index if not exists idx_document_capture_company_status
  on public.document_capture (company_id, status)
  where deleted_at is null;

create index if not exists idx_document_capture_pending_ttl
  on public.document_capture (uploaded_at)
  where status = 'pending_upload' and finalized_at is null and deleted_at is null;

drop trigger if exists trg_document_capture_updated_at on public.document_capture;
create trigger trg_document_capture_updated_at
before update on public.document_capture
for each row execute function public.set_updated_at();

-- Immutabilità post-finalize
create or replace function public.document_capture_guard_post_finalize()
returns trigger
language plpgsql
as $$
begin
  if old.finalized_at is not null then
    if new.storage_path is distinct from old.storage_path
      or new.sha256 is distinct from old.sha256
      or new.mime is distinct from old.mime
      or new.file_size_bytes is distinct from old.file_size_bytes
      or new.company_id is distinct from old.company_id
      or new.storage_version is distinct from old.storage_version
      or new.storage_etag is distinct from old.storage_etag
    then
      raise exception 'document_capture immutabile dopo finalize';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_document_capture_guard_post_finalize on public.document_capture;
create trigger trg_document_capture_guard_post_finalize
before update on public.document_capture
for each row execute function public.document_capture_guard_post_finalize();

-- ---------------------------------------------------------------------------
-- document_capture_events (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.document_capture_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  document_capture_id uuid not null references public.document_capture (id) on delete restrict,
  event_type text not null,
  idempotency_key text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint document_capture_events_type_chk check (
    event_type in (
      'policy_created', 'storage_uploaded', 'finalized', 'duplicate_detected',
      'expiration', 'status_changed', 'category_changed', 'linked', 'archived', 'soft_deleted',
      'analyze_started', 'analyze_completed', 'analyze_failed',
      'dry_run', 'apply_started', 'apply_committed', 'apply_failed', 'apply_partial'
    )
  ),
  constraint document_capture_events_idempotency_uniq unique (document_capture_id, idempotency_key)
);

create index if not exists idx_document_capture_events_capture
  on public.document_capture_events (document_capture_id, created_at);

-- ---------------------------------------------------------------------------
-- Satellite tables (schema predisposto Fase 2/3)
-- ---------------------------------------------------------------------------

create table if not exists public.document_capture_attempts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  document_capture_id uuid not null references public.document_capture (id) on delete restrict,
  attempt_number integer not null,
  provider text not null,
  model text not null,
  prompt_version text,
  raw_response jsonb,
  structured_response jsonb,
  status text not null default 'pending',
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  estimated_cost_usd numeric(10, 6),
  duration_ms integer,
  provider_request_id text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_capture_attempts_status_chk check (
    status in ('pending', 'completed', 'failed')
  )
);

create index if not exists idx_document_capture_attempts_company_started
  on public.document_capture_attempts (company_id, started_at desc);

create table if not exists public.document_capture_fields (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  document_capture_id uuid not null references public.document_capture (id) on delete restrict,
  attempt_id uuid references public.document_capture_attempts (id) on delete set null,
  field_key text not null,
  raw_value text,
  normalized_value text,
  confirmed_value text,
  confidence numeric(5, 4),
  value_source text not null,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_capture_fields_source_chk check (
    value_source in ('ai', 'manual', 'existing')
  ),
  constraint document_capture_fields_confidence_chk check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

create unique index if not exists uq_document_capture_fields_key
  on public.document_capture_fields (document_capture_id, field_key);

create table if not exists public.document_capture_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  document_capture_id uuid not null references public.document_capture (id) on delete restrict,
  kind text not null,
  status text not null default 'pending',
  source_fields_hash text,
  capture_version integer,
  capture_updated_at timestamptz,
  plan_json jsonb not null default '{}'::jsonb,
  approved_creates_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  constraint document_capture_applications_kind_chk check (
    kind in ('dry_run', 'apply')
  ),
  constraint document_capture_applications_status_chk check (
    status in ('pending', 'committed', 'failed', 'rolled_back')
  )
);

create table if not exists public.scheda_pdf_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  tipo text not null,
  version text not null,
  layout_key text not null,
  renderer_hash text not null,
  params_schema_version text not null default '1',
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null,
  notes text,
  constraint scheda_pdf_templates_tipo_chk check (
    tipo in ('ingresso', 'lavorazioni', 'ricambi')
  ),
  constraint scheda_pdf_templates_company_tipo_version_uniq unique (company_id, tipo, version)
);

create table if not exists public.scheda_pdf_generations (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.scheda_pdf_templates (id) on delete restrict,
  renderer_hash text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles (id) on delete set null,
  artifact_hash text,
  params_json jsonb not null default '{}'::jsonb
);