-- Infrastruttura import dati: batch audit + meta clienti estensibile.

alter table public.clienti_anagrafiche
  add column if not exists meta jsonb not null default '{}'::jsonb;

alter table public.clienti_anagrafiche drop constraint if exists clienti_anagrafiche_meta_obj_chk;
alter table public.clienti_anagrafiche add constraint clienti_anagrafiche_meta_obj_chk
  check (jsonb_typeof(meta) = 'object');

comment on column public.clienti_anagrafiche.meta is 'Campi import/futuri: codice_fiscale, listino, condizioni_pagamento, categoria, …';

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  status text not null default 'pending',
  file_name text not null,
  file_sha256 text,
  mapping jsonb not null default '{}'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  error_log jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint import_batches_entity_chk check (
    entity in ('magazzino_ricambi', 'clienti_anagrafica')
  ),
  constraint import_batches_status_chk check (
    status in ('pending', 'running', 'success', 'partial', 'failed', 'cancelled')
  ),
  constraint import_batches_mapping_obj_chk check (jsonb_typeof(mapping) = 'object'),
  constraint import_batches_rules_obj_chk check (jsonb_typeof(rules) = 'object'),
  constraint import_batches_stats_obj_chk check (jsonb_typeof(stats) = 'object'),
  constraint import_batches_error_log_arr_chk check (jsonb_typeof(error_log) = 'array')
);

create index if not exists idx_import_batches_entity_created on public.import_batches (entity, created_at desc);
create index if not exists idx_import_batches_created_by on public.import_batches (created_by, created_at desc);

alter table public.import_batches enable row level security;

drop policy if exists cap_import_batches_select on public.import_batches;
create policy cap_import_batches_select on public.import_batches for select to authenticated
using (
  created_by = auth.uid()
  or public.rbac_has_capability(auth.uid(), 'can_manage_settings')
  or public.rbac_module_can('magazzino', 'admin')
);

drop policy if exists cap_import_batches_insert on public.import_batches;
create policy cap_import_batches_insert on public.import_batches for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists cap_import_batches_update on public.import_batches;
create policy cap_import_batches_update on public.import_batches for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create table if not exists public.import_mapping_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity text not null,
  name text not null,
  mapping jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_mapping_presets_entity_chk check (
    entity in ('magazzino_ricambi', 'clienti_anagrafica')
  ),
  constraint import_mapping_presets_mapping_obj_chk check (jsonb_typeof(mapping) = 'object'),
  constraint import_mapping_presets_user_entity_name_uq unique (user_id, entity, name)
);

create index if not exists idx_import_mapping_presets_user_entity on public.import_mapping_presets (user_id, entity);

alter table public.import_mapping_presets enable row level security;

drop policy if exists cap_import_mapping_presets_all on public.import_mapping_presets;
create policy cap_import_mapping_presets_all on public.import_mapping_presets for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
