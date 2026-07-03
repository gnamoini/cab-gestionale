-- TKB draft store + snapshot metadata + operative history (OHR)

alter table public.tkb_published_snapshots
  add column if not exists pipeline_version text not null default '1.0.0',
  add column if not exists builder_version text not null default '1.0.0',
  add column if not exists build_version text not null default '1.0.0',
  add column if not exists build_duration_ms int,
  add column if not exists build_stats jsonb not null default '{}',
  add column if not exists app_git_sha text;

create table if not exists public.tkb_draft_store (
  id int primary key default 1 check (id = 1),
  draft_json jsonb not null default '{}',
  draft_hash text not null default '',
  build_stats jsonb not null default '{}',
  built_at timestamptz not null default now(),
  stale boolean not null default true,
  pending_events jsonb not null default '[]',
  entity_index jsonb not null default '{}',
  last_full_build_at timestamptz,
  build_mode text not null default 'full'
    check (build_mode in ('full', 'incremental'))
);

alter table public.tkb_draft_store enable row level security;

create policy tkb_draft_read_authenticated on public.tkb_draft_store
  for select to authenticated using (true);

-- Operative history (Description Engine contextual ranking — NOT TKB)
create table if not exists public.operative_history_cases (
  id uuid primary key default gen_random_uuid(),
  case_key text not null unique,
  lavorazione_id uuid references public.lavorazioni(id) on delete set null,
  preventivo_id uuid references public.preventivi(id) on delete set null,
  mezzo_id uuid references public.mezzi(id) on delete set null,
  cliente_norm text not null default '',
  mezzo_fingerprint jsonb not null default '{}',
  lavorazione_fingerprint jsonb not null default '{}',
  technical_blob_norm text not null default '',
  client_description text not null default '',
  anomalia_norm text,
  esito text,
  durata_minuti int,
  intervenuto_at timestamptz,
  source_quality text not null default 'generated'
    check (source_quality in ('generated', 'operator_approved', 'zero_edit')),
  indexed_at timestamptz not null default now()
);

create index if not exists idx_ohc_mezzo on public.operative_history_cases (mezzo_id);
create index if not exists idx_ohc_cliente on public.operative_history_cases (cliente_norm);
create index if not exists idx_ohc_intervenuto on public.operative_history_cases (intervenuto_at desc nulls last);

create table if not exists public.operative_history_signals (
  case_id uuid primary key references public.operative_history_cases(id) on delete cascade,
  confirmed_weight numeric not null default 1.0,
  usage_count int not null default 0,
  correction_count int not null default 0,
  last_used_at timestamptz,
  last_confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.operative_history_cases enable row level security;
alter table public.operative_history_signals enable row level security;

create policy ohc_read_authenticated on public.operative_history_cases
  for select to authenticated using (true);

create policy ohs_read_authenticated on public.operative_history_signals
  for select to authenticated using (true);
