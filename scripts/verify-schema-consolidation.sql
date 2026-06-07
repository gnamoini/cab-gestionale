-- Verifica post-migration 20260522120000_schema_consolidation_safe.sql
-- Eseguire su staging/prod: supabase db execute --linked --file scripts/verify-schema-consolidation.sql

-- 1) Funzioni RBAC obsolete assenti
select proname as should_be_empty
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname like 'rbac_resource_allows_%';

-- 2) current_profile_role esiste ed è wrapper
select pg_get_functiondef('public.current_profile_role()'::regprocedure) ilike '%rbac_role%' as wraps_rbac_role;

-- 3) segnalazioni: nessuna policy INSERT/UPDATE
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'segnalazioni'
  and cmd in ('INSERT', 'UPDATE', 'ALL')
order by policyname;

-- 4) lavorazione_documents: solo cap_* (max 4 policy: CRUD)
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'lavorazione_documents'
order by cmd, policyname;

-- 5) Policy duplicate (atteso: auth_logs INSERT multipli, storage documenti SELECT doppio)
select schemaname, tablename, cmd, count(*) as n, array_agg(policyname order by policyname) as names
from pg_policies
where schemaname in ('public', 'storage')
group by schemaname, tablename, cmd
having count(*) > 1
order by tablename, cmd;

-- 6) Tabelle applicative con RLS
select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles', 'mezzi', 'lavorazioni', 'scheda_lavorazione',
    'magazzino_ricambi', 'movimenti_ricambi', 'preventivi', 'documenti',
    'log_modifiche', 'app_settings', 'app_settings_audit', 'user_permissions',
    'auth_logs', 'segnalazioni', 'support_notes', 'lavorazione_documents',
    'report_manual_entries', 'bunder_documents', 'dashboard_promemoria',
    'dipendenti_timesheet_employees', 'dipendenti_timesheet_entries'
  )
order by c.relname;

-- 6b) Counter tables (RLS off by design — trigger-only; no client .from())
select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'lavorazioni_codice_counters',
    'preventivi_lavorazione_numero_counters',
    'preventivi_manuali_numero_counters'
  )
order by c.relname;

-- 6c) Realtime publication vs frontend GESTIONALE_TABLE_QUERY_KEYS
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;

-- 6d) Tabelle deprecated in publication (atteso: 0 righe post 20260709120000_realtime_prune_deprecated_supporto)
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('segnalazioni', 'support_notes');

-- 7) Righe segnalazioni non presenti in support_notes (pre-drop tabella)
select count(*) as orphan_segnalazioni_rows
from public.segnalazioni s
where not exists (select 1 from public.support_notes n where n.id = s.id);

-- 8) Spina RBAC presente
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('rbac_has_capability', 'rbac_can_read_row', 'soft_delete_lavorazione', 'bulk_upsert_app_settings')
order by proname;
