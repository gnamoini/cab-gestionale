-- Entity Resolution: aliases settings seed, corrections, cache, event type

begin;

-- Aliases in app_settings (globale, stesso pattern degli altri moduli settings)
insert into public.app_settings (module, key, value)
select 'entity_resolution', 'aliases', '{}'::jsonb
where not exists (
  select 1 from public.app_settings s
  where s.module = 'entity_resolution' and s.key = 'aliases'
);

create table if not exists public.entity_resolution_corrections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  entity_type text not null,
  ocr_norm_key text not null,
  ocr_raw_sample text not null default '',
  resolved_label text not null,
  resolved_id text,
  source text not null default 'manual_confirm',
  hit_count integer not null default 1,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_resolution_corrections_source_chk check (
    source in ('manual_confirm', 'ambiguity_pick', 'field_edit')
  ),
  constraint entity_resolution_corrections_unique unique (company_id, entity_type, ocr_norm_key)
);

create index if not exists idx_entity_resolution_corrections_company
  on public.entity_resolution_corrections (company_id, entity_type);

create table if not exists public.entity_resolution_cache (
  company_id uuid not null references public.companies (id) on delete restrict,
  entity_type text not null,
  ocr_hash text not null,
  resolved_label text not null,
  resolved_id text,
  confidence numeric(5, 4) not null,
  reason text not null,
  strategy text not null,
  versions_json jsonb not null default '{}'::jsonb,
  hit_count integer not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  primary key (company_id, entity_type, ocr_hash)
);

alter table public.entity_resolution_corrections enable row level security;
alter table public.entity_resolution_cache enable row level security;

drop policy if exists erc_select on public.entity_resolution_corrections;
create policy erc_select on public.entity_resolution_corrections for select to authenticated
  using (company_id = public.rbac_user_company_id());

drop policy if exists erc_insert on public.entity_resolution_corrections;
create policy erc_insert on public.entity_resolution_corrections for insert to authenticated
  with check (company_id = public.rbac_user_company_id());

drop policy if exists erc_update on public.entity_resolution_corrections;
create policy erc_update on public.entity_resolution_corrections for update to authenticated
  using (company_id = public.rbac_user_company_id());

drop policy if exists ercache_select on public.entity_resolution_cache;
create policy ercache_select on public.entity_resolution_cache for select to authenticated
  using (company_id = public.rbac_user_company_id());

drop policy if exists ercache_upsert on public.entity_resolution_cache;
create policy ercache_upsert on public.entity_resolution_cache for all to authenticated
  using (company_id = public.rbac_user_company_id())
  with check (company_id = public.rbac_user_company_id());

alter table public.document_capture_events
  drop constraint if exists document_capture_events_type_chk;

alter table public.document_capture_events
  add constraint document_capture_events_type_chk check (
    event_type in (
      'policy_created', 'storage_uploaded', 'finalized', 'duplicate_detected',
      'expiration', 'status_changed', 'category_changed', 'linked', 'archived', 'soft_deleted',
      'analyze_started', 'analyze_completed', 'analyze_failed', 'fields_confirmed',
      'dry_run', 'apply_started', 'apply_committed', 'apply_failed', 'apply_partial',
      'pipeline_phase_completed', 'field_overridden', 'document_edited',
      'validation_reviewed', 'apply_approved', 'entity_resolution_confirmed'
    )
  );

commit;
