-- Health Score v2 audit runs
create table if not exists public.health_score_runs (
  id uuid primary key default gen_random_uuid(),
  computed_at timestamptz not null default now(),
  engine_version text not null,
  config_version text not null,
  schema_version text not null,
  status text not null default 'READY',
  period_start timestamptz not null,
  period_end timestamptz not null,
  prev_period_start timestamptz not null,
  prev_period_end timestamptz not null,
  workshop_size text not null,
  score_raw int not null,
  score_smoothed int not null,
  label text not null,
  tone text not null,
  input_snapshot jsonb not null,
  input_hash text not null,
  config_hash text not null,
  breakdown jsonb not null,
  confidence_overall numeric,
  data_quality_overall numeric,
  duration_ms int,
  cache_hit boolean not null default false,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_health_score_runs_computed_at
  on public.health_score_runs (computed_at desc);

comment on table public.health_score_runs is 'Audit trail Health Score officina v2 — snapshot input e breakdown completo.';

alter table public.health_score_runs enable row level security;

drop policy if exists health_score_runs_select_auth on public.health_score_runs;
create policy health_score_runs_select_auth
on public.health_score_runs for select to authenticated
using (true);

-- Scrittura solo service role (no policy insert/update per authenticated)
