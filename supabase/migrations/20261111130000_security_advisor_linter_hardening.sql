-- Supabase Security Advisor: lint 0010 (security_definer_view) + 0013 (rls_disabled_in_public).
-- Idempotent: CREATE OR REPLACE VIEW, REVOKE, ENABLE ROW LEVEL SECURITY, DO $$ gates.

begin;

-- ---------------------------------------------------------------------------
-- Parte A — views: security_invoker (lint 0010)
-- ---------------------------------------------------------------------------

create or replace view public.maintenance_events
with (security_invoker = true) as
select
  v.id,
  v.lavorazione_id,
  v.mezzo_id,
  v.performed_at as data_esecuzione,
  v.ore_at_service as ore,
  v.km_at_service as km,
  v.performed_by as operatore,
  v.compliance_auto,
  v.compliance_review,
  least(
    100::numeric,
    greatest(
      0::numeric,
      v.compliance_auto + coalesce(
        (
          select sum((adj.value->>'delta')::numeric)
          from jsonb_array_elements(
            case
              when jsonb_typeof(v.compliance_review->'adjustments') = 'array'
              then v.compliance_review->'adjustments'
              else '[]'::jsonb
            end
          ) as adj(value)
          where coalesce((v.compliance_review->>'approved')::boolean, false)
        ),
        0::numeric
      )
    )
  ) as compliance_effective,
  v.compliance_diff_json,
  v.compliance_algorithm_version,
  v.snapshot_schema_version,
  v.preset_snapshot,
  v.execution_origin,
  v.created_at,
  v.updated_at
from public.vehicle_maintenance_services v;

grant select on public.maintenance_events to authenticated;

create or replace view public.maintenance_presets
with (security_invoker = true) as
select * from public.maintenance_plans;

grant select on public.maintenance_presets to authenticated;

create or replace view public.import_export_telemetry_daily
with (security_invoker = true) as
select
  date_trunc('day', created_at)::date as day,
  kind,
  entity,
  count(*)::int as operation_count,
  coalesce(avg(duration_ms), 0)::int as avg_duration_ms,
  coalesce(sum(row_count), 0)::bigint as total_rows
from public.import_export_telemetry
group by 1, 2, 3;

grant select on public.import_export_telemetry_daily to authenticated;

-- ---------------------------------------------------------------------------
-- Parte B — internal tables: explicit REVOKE + ENABLE RLS (lint 0013)
-- ---------------------------------------------------------------------------

revoke all on table public.audit_note_ssot_conflicts from public;
revoke all on table public.audit_note_ssot_conflicts from anon;
revoke all on table public.audit_note_ssot_conflicts from authenticated;
alter table public.audit_note_ssot_conflicts enable row level security;

revoke all on table public.attrezzature_dedup_report from public;
revoke all on table public.attrezzature_dedup_report from anon;
revoke all on table public.attrezzature_dedup_report from authenticated;
alter table public.attrezzature_dedup_report enable row level security;

revoke all on table public.mezzi_dedup_report from public;
revoke all on table public.mezzi_dedup_report from anon;
revoke all on table public.mezzi_dedup_report from authenticated;
alter table public.mezzi_dedup_report enable row level security;

revoke all on table public.notification_templates from public;
revoke all on table public.notification_templates from anon;
revoke all on table public.notification_templates from authenticated;
alter table public.notification_templates enable row level security;

revoke all on table public.search_document_rebuild_queue from public;
revoke all on table public.search_document_rebuild_queue from anon;
revoke all on table public.search_document_rebuild_queue from authenticated;
alter table public.search_document_rebuild_queue enable row level security;

-- ---------------------------------------------------------------------------
-- Parte C — verification gates
-- ---------------------------------------------------------------------------

do $$
declare
  v_missing_rls text[];
  v_client_grants text[];
  v_missing_invoker text[];
begin
  -- C1: RLS enabled on all 5 internal tables
  select coalesce(array_agg(c.relname order by c.relname), array[]::text[])
  into v_missing_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname = any(array[
      'audit_note_ssot_conflicts',
      'attrezzature_dedup_report',
      'mezzi_dedup_report',
      'notification_templates',
      'search_document_rebuild_queue'
    ])
    and not c.relrowsecurity;

  if coalesce(array_length(v_missing_rls, 1), 0) > 0 then
    raise exception 'RLS not enabled on: %', array_to_string(v_missing_rls, ', ');
  end if;

  -- C2: client roles must not retain table privileges
  select coalesce(array_agg(t.tablename order by t.tablename), array[]::text[])
  into v_client_grants
  from unnest(array[
    'audit_note_ssot_conflicts',
    'attrezzature_dedup_report',
    'mezzi_dedup_report',
    'notification_templates',
    'search_document_rebuild_queue'
  ]) as t(tablename)
  where has_table_privilege('authenticated', format('public.%I', t.tablename), 'SELECT')
     or has_table_privilege('authenticated', format('public.%I', t.tablename), 'INSERT')
     or has_table_privilege('authenticated', format('public.%I', t.tablename), 'UPDATE')
     or has_table_privilege('authenticated', format('public.%I', t.tablename), 'DELETE')
     or has_table_privilege('anon', format('public.%I', t.tablename), 'SELECT')
     or has_table_privilege('anon', format('public.%I', t.tablename), 'INSERT')
     or has_table_privilege('anon', format('public.%I', t.tablename), 'UPDATE')
     or has_table_privilege('anon', format('public.%I', t.tablename), 'DELETE');

  if coalesce(array_length(v_client_grants, 1), 0) > 0 then
    raise exception 'Client roles still have table privileges on: %', array_to_string(v_client_grants, ', ');
  end if;

  -- C3: all public views must use security_invoker=true
  select coalesce(array_agg(c.relname order by c.relname), array[]::text[])
  into v_missing_invoker
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'v'
    and (
      c.reloptions is null
      or not exists (
        select 1
        from unnest(c.reloptions) opt
        where opt = 'security_invoker=true'
      )
    );

  if coalesce(array_length(v_missing_invoker, 1), 0) > 0 then
    raise exception 'One or more public views are missing security_invoker=true: %',
      array_to_string(v_missing_invoker, ', ');
  end if;

  raise notice 'security_advisor_linter_hardening OK';
end $$;

commit;
