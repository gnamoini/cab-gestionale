-- Runtime audit coverage telemetry (CI = prevenzione, questo = garanzia).

create table if not exists public.audit_coverage_events (
  id uuid primary key default gen_random_uuid(),
  mutation_key text not null,
  expected_audit boolean not null default true,
  actual_audit boolean not null default false,
  request_id uuid,
  correlation_id uuid,
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_coverage_events_created
  on public.audit_coverage_events (created_at desc);

create index if not exists idx_audit_coverage_events_mutation
  on public.audit_coverage_events (mutation_key, created_at desc);

alter table public.audit_coverage_events enable row level security;

create policy cap_audit_coverage_events_select on public.audit_coverage_events
  for select to authenticated
  using (public.rbac_user_page_access_level(auth.uid(), 'sicurezza') = 'write');

create policy cap_audit_coverage_events_insert on public.audit_coverage_events
  for insert to authenticated
  with check (true);

comment on table public.audit_coverage_events is
  'Telemetry: mutation attesa vs audit effettivo per gap coverage runtime.';
