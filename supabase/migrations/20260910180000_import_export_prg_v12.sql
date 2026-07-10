begin;

-- PRG v1.2: batch entity bridge, granular fingerprint unique, telemetry daily view

create table if not exists public.import_batch_entities (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches (id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (batch_id, entity, entity_id)
);

create index if not exists idx_import_batch_entities_batch
  on public.import_batch_entities (batch_id);

alter table public.import_batch_entities enable row level security;

drop policy if exists cap_import_batch_entities_select on public.import_batch_entities;
create policy cap_import_batch_entities_select on public.import_batch_entities
  for select to authenticated
  using (
    exists (
      select 1 from public.import_batches b
      where b.id = batch_id
        and (b.created_by = auth.uid() or public.rbac_has_capability(auth.uid(), 'can_manage_settings'))
    )
  );

drop policy if exists cap_import_batch_entities_insert on public.import_batch_entities;
create policy cap_import_batch_entities_insert on public.import_batch_entities
  for insert to authenticated
  with check (
    exists (
      select 1 from public.import_batches b
      where b.id = batch_id and b.created_by = auth.uid()
    )
  );

drop policy if exists cap_import_batch_entities_delete on public.import_batch_entities;
create policy cap_import_batch_entities_delete on public.import_batch_entities
  for delete to authenticated
  using (
    exists (
      select 1 from public.import_batches b
      where b.id = batch_id and b.created_by = auth.uid()
    )
  );

drop index if exists public.import_batches_fingerprint_success_uidx;

create unique index import_batches_fingerprint_success_uidx
  on public.import_batches (created_by, entity, fingerprint_hash, import_mode)
  where status = 'success' and fingerprint_hash is not null;

create or replace view public.import_export_telemetry_daily as
select
  date_trunc('day', created_at)::date as day,
  kind,
  entity,
  count(*)::int as operation_count,
  coalesce(avg(duration_ms), 0)::int as avg_duration_ms,
  coalesce(sum(row_count), 0)::bigint as total_rows
from public.import_export_telemetry
group by 1, 2, 3;

commit;
