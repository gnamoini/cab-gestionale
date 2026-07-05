-- Technical Knowledge Base + Description Engine (production schema)

create table if not exists public.tkb_published_snapshots (
  id uuid primary key default gen_random_uuid(),
  kb_version int not null unique,
  snapshot_json jsonb not null,
  snapshot_hash text not null unique,
  draft_hash text not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id),
  change_summary text,
  supersedes_kb_version int references public.tkb_published_snapshots(kb_version)
);

create index if not exists idx_tkb_snapshots_published_at
  on public.tkb_published_snapshots (published_at desc);

create table if not exists public.tkb_version_registry (
  kb_version int primary key references public.tkb_published_snapshots(kb_version) on delete cascade,
  published_at timestamptz not null,
  published_by uuid references auth.users(id),
  change_summary text,
  snapshot_hash text not null,
  draft_hash text not null
);

create table if not exists public.interventi_categorie (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0,
  publish_status text not null default 'draft'
    check (publish_status in ('draft','review','published','deprecated')),
  published_kb_version int,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.interventi_componenti (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  categoria_slug text,
  synonyms text[] not null default '{}',
  metadata jsonb not null default '{}',
  publish_status text not null default 'draft'
    check (publish_status in ('draft','review','published','deprecated')),
  published_kb_version int,
  updated_at timestamptz not null default now()
);

create table if not exists public.interventi_sintomi (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  keywords text[] not null default '{}',
  related_componenti_slugs text[] not null default '{}',
  publish_status text not null default 'draft'
    check (publish_status in ('draft','review','published','deprecated')),
  published_kb_version int,
  updated_at timestamptz not null default now()
);

create table if not exists public.interventi_procedure (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  categoria_slug text,
  attivita jsonb not null,
  controlli_finali jsonb not null default '[]',
  metadata jsonb not null default '{}',
  publish_status text not null default 'draft'
    check (publish_status in ('draft','review','published','deprecated')),
  published_kb_version int,
  updated_at timestamptz not null default now()
);

create table if not exists public.interventi_catalogo (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  categoria_slug text,
  keywords text[] not null default '{}',
  componenti_slugs text[] not null default '{}',
  sintomi_slugs text[] not null default '{}',
  compatibilita jsonb not null default '{}',
  procedure_slugs text[] not null default '{}',
  activity_overrides jsonb not null default '[]',
  attivita_principali jsonb not null,
  attivita_complementari jsonb not null default '[]',
  controlli_finali jsonb not null default '[]',
  metadata jsonb not null default '{}',
  publish_status text not null default 'draft'
    check (publish_status in ('draft','review','published','deprecated')),
  published_kb_version int,
  updated_at timestamptz not null default now()
);

create table if not exists public.ricambi_componenti_map (
  id uuid primary key default gen_random_uuid(),
  ricambio_id uuid not null references public.magazzino_ricambi(id) on delete cascade,
  componente_slug text not null,
  azione_prevista text not null
    check (azione_prevista in ('sostituzione','installazione','revisione')),
  activity_id text not null,
  match_confidence numeric not null default 1.0
    check (match_confidence >= 0 and match_confidence <= 1),
  match_quality text not null default 'certain'
    check (match_quality in ('certain','partial','needs_review')),
  line_template text,
  required_in_description boolean not null default false,
  active boolean not null default true,
  valid_from date not null default current_date,
  valid_to date,
  publish_status text not null default 'draft'
    check (publish_status in ('draft','review','published','deprecated')),
  published_kb_version int,
  unique (ricambio_id, componente_slug, azione_prevista, valid_from)
);

create table if not exists public.interventi_catalogo_audit (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_slug text,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.description_generation_usage (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null unique,
  preventivo_id uuid references public.preventivi(id) on delete set null,
  lavorazione_id uuid references public.lavorazioni(id) on delete set null,
  event_type text not null
    check (event_type in ('generated','regenerated','operator_edit','approved')),
  engine_version text not null,
  kb_version int not null,
  detail_level text not null,
  confidence numeric not null,
  confidence_tier text not null,
  confidence_factors jsonb not null,
  generation_context_hash text not null,
  generation_sequence int not null,
  lines_count int not null,
  fallback_used boolean not null default false,
  fallback_reason text,
  operator_acceptance_rate numeric,
  zero_edit boolean,
  technical_hallucination_count int not null default 0,
  ai_polish_applied boolean not null default false,
  ai_reject_reason text,
  semantic_fingerprint_pre text,
  semantic_fingerprint_post text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_desc_gen_usage_preventivo
  on public.description_generation_usage (preventivo_id);
create index if not exists idx_desc_gen_usage_context
  on public.description_generation_usage (generation_context_hash);

create table if not exists public.description_generation_lines (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.description_generation_usage(generation_id) on delete cascade,
  preventivo_id uuid references public.preventivi(id) on delete cascade,
  activity_id text,
  text text not null,
  source_type text not null check (source_type in (
    'tkb_procedure','tkb_intervento','tkb_ricambio_map',
    'legacy_enrichment','legacy_heuristic','legacy_similarity','legacy_context',
    'suggestion_approved','operator_rephrased'
  )),
  source_id text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  is_verified_technical boolean not null default true,
  sort int not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_desc_gen_lines_generation
  on public.description_generation_lines (generation_id);
create index if not exists idx_desc_gen_lines_preventivo
  on public.description_generation_lines (preventivo_id);
create index if not exists idx_desc_gen_lines_activity
  on public.description_generation_lines (activity_id);

create table if not exists public.description_operator_overrides (
  id uuid primary key default gen_random_uuid(),
  preventivo_id uuid not null references public.preventivi(id) on delete cascade,
  generation_id uuid not null,
  activity_id text not null,
  source_type text not null,
  source_id text not null,
  action text not null check (action in ('excluded','rephrased','moved')),
  override_status text not null default 'active'
    check (override_status in ('active','obsolete','reapplied')),
  original_text text not null,
  new_text text,
  new_sort int,
  reason text,
  obsolete_reason text,
  kb_version_at_override int not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.preventivi_description_suggestions (
  id uuid primary key default gen_random_uuid(),
  preventivo_id uuid references public.preventivi(id) on delete set null,
  technical_source_norm text not null,
  suggested_from text not null,
  suggested_to text not null,
  suggestion_type text not null check (suggestion_type in ('line_rephrase','full_mapping')),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  applied_to_kb boolean not null default false,
  kb_entry_slug text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.tkb_published_snapshots enable row level security;
alter table public.description_generation_usage enable row level security;
alter table public.description_generation_lines enable row level security;
alter table public.description_operator_overrides enable row level security;
alter table public.preventivi_description_suggestions enable row level security;

create policy tkb_snapshots_read_authenticated on public.tkb_published_snapshots
  for select to authenticated using (true);

comment on table public.tkb_published_snapshots is
  'Snapshot immutabile KB — unica sorgente runtime Description Engine';
