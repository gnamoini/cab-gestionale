-- Apply jobs (persistent saga) + entity links for document capture.

begin;

create table if not exists public.document_capture_apply_jobs (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references public.document_capture(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid references public.document_capture_applications(id) on delete set null,
  status text not null,
  step_current text,
  created_lavorazione_id uuid references public.lavorazioni(id) on delete set null,
  created_scheda_ids jsonb not null default '[]'::jsonb,
  error_code text,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint document_capture_apply_jobs_status_check check (
    status in (
      'CREATED',
      'VALIDATING',
      'APPLYING',
      'LAVORAZIONE_CREATED',
      'SCHEDE_CREATED',
      'RICAMBI_CREATED',
      'COMMITTED',
      'FAILED',
      'RECOVERY_REQUIRED'
    )
  )
);

create index if not exists idx_document_capture_apply_jobs_capture
  on public.document_capture_apply_jobs (capture_id, created_at desc);

create index if not exists idx_document_capture_apply_jobs_recovery
  on public.document_capture_apply_jobs (company_id, status)
  where status = 'RECOVERY_REQUIRED';

create table if not exists public.document_capture_links (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references public.document_capture(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  relation text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint document_capture_links_entity_type_check check (
    entity_type in (
      'lavorazione',
      'scheda_lavorazione',
      'mezzo',
      'ricambio_movimento',
      'attrezzatura',
      'duplicate_capture'
    )
  ),
  constraint document_capture_links_relation_check check (
    relation in ('created_from', 'attached_to', 'duplicate_of')
  )
);

create index if not exists idx_document_capture_links_capture
  on public.document_capture_links (capture_id);

create index if not exists idx_document_capture_links_entity
  on public.document_capture_links (entity_type, entity_id);

alter table public.document_capture_apply_jobs enable row level security;
alter table public.document_capture_links enable row level security;

create policy cap_document_capture_apply_jobs_select on public.document_capture_apply_jobs
  for select to authenticated
  using (company_id = public.rbac_user_company_id());

create policy cap_document_capture_apply_jobs_insert on public.document_capture_apply_jobs
  for insert to authenticated
  with check (
    company_id = public.rbac_user_company_id()
    and public.rbac_module_can('document_capture', 'write')
  );

create policy cap_document_capture_apply_jobs_update on public.document_capture_apply_jobs
  for update to authenticated
  using (
    company_id = public.rbac_user_company_id()
    and public.rbac_module_can('document_capture', 'write')
  )
  with check (company_id = public.rbac_user_company_id());

create policy cap_document_capture_links_select on public.document_capture_links
  for select to authenticated
  using (company_id = public.rbac_user_company_id());

create policy cap_document_capture_links_insert on public.document_capture_links
  for insert to authenticated
  with check (
    company_id = public.rbac_user_company_id()
    and public.rbac_module_can('document_capture', 'write')
  );

grant select, insert, update on public.document_capture_apply_jobs to authenticated;
grant select, insert on public.document_capture_links to authenticated;

commit;
