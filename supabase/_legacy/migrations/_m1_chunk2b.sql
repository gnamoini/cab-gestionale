
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