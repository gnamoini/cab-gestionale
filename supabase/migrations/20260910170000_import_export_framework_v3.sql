-- Import/Export framework v3: telemetry, batch metadata, export jobs, ordini_fornitori entity.

begin;

alter table public.import_batches drop constraint if exists import_batches_entity_chk;
alter table public.import_batches add constraint import_batches_entity_chk check (
  entity in (
    'magazzino_ricambi', 'clienti_anagrafica', 'listino_ricambi', 'mezzi', 'preventivi',
    'settings_fornitori', 'settings_produttori', 'settings_categorie', 'settings_marche',
    'settings_addetti', 'settings_cantieri', 'settings_utilizzatori',
    'settings_hierarchy_attrezzature', 'settings_hierarchy_telai',
    'lavorazioni', 'ordini_fornitori', 'fatture_draft', 'billing_customers',
    'documenti_metadata', 'dipendenti_timesheet'
  )
);

alter table public.import_mapping_presets drop constraint if exists import_mapping_presets_entity_chk;
alter table public.import_mapping_presets add constraint import_mapping_presets_entity_chk check (
  entity in (
    'magazzino_ricambi', 'clienti_anagrafica', 'listino_ricambi', 'mezzi', 'preventivi',
    'settings_fornitori', 'settings_produttori', 'settings_categorie', 'settings_marche',
    'settings_addetti', 'settings_cantieri', 'settings_utilizzatori',
    'settings_hierarchy_attrezzature', 'settings_hierarchy_telai',
    'lavorazioni', 'ordini_fornitori', 'fatture_draft', 'billing_customers',
    'documenti_metadata', 'dipendenti_timesheet'
  )
);

alter table public.import_batches
  add column if not exists fingerprint_hash text,
  add column if not exists template_version text,
  add column if not exists plugin_version text,
  add column if not exists schema_hash text,
  add column if not exists import_mode text,
  add column if not exists page_slug text,
  add column if not exists correlation_id text,
  add column if not exists export_mode text,
  add column if not exists created_entity_ids jsonb not null default '[]'::jsonb;

create unique index if not exists import_batches_fingerprint_success_uidx
  on public.import_batches (created_by, fingerprint_hash)
  where status = 'success' and fingerprint_hash is not null;

create table if not exists public.import_export_telemetry (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('import', 'export')),
  entity text not null,
  user_id uuid references public.profiles(id) on delete set null,
  duration_ms int not null,
  row_count int,
  export_mode text,
  snapshot_strategy text,
  batch_id uuid,
  correlation_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_import_export_telemetry_created
  on public.import_export_telemetry (created_at desc);

alter table public.import_export_telemetry enable row level security;

drop policy if exists cap_import_export_telemetry_select on public.import_export_telemetry;
create policy cap_import_export_telemetry_select on public.import_export_telemetry
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.rbac_has_capability(auth.uid(), 'can_manage_settings')
  );

drop policy if exists cap_import_export_telemetry_insert on public.import_export_telemetry;
create policy cap_import_export_telemetry_insert on public.import_export_telemetry
  for insert to authenticated
  with check (user_id = auth.uid());

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'success', 'failed')),
  export_mode text not null,
  format text not null default 'xlsx',
  scope jsonb not null default '{}'::jsonb,
  progress int not null default 0,
  result_path text,
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_export_jobs_user_created on public.export_jobs (user_id, created_at desc);

alter table public.export_jobs enable row level security;

drop policy if exists cap_export_jobs_own on public.export_jobs;
create policy cap_export_jobs_own on public.export_jobs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;
