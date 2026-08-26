-- Verifica RLS hardening (eseguire con: npx supabase db execute --linked --file scripts/verify-rls-hardening.sql)

-- 1) Tutte le tabelle applicative con RLS attivo
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles', 'mezzi', 'lavorazioni', 'scheda_lavorazione',
    'magazzino_ricambi', 'movimenti_ricambi', 'preventivi', 'documenti',
    'log_modifiche', 'app_settings', 'app_settings_audit', 'user_permissions',
    'auth_logs', 'segnalazioni', 'support_notes', 'lavorazione_documents'
  )
order by c.relname;

-- 2) Conteggio policy per tabella
select schemaname, tablename, count(*) as policy_count
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'mezzi', 'lavorazioni', 'scheda_lavorazione',
    'magazzino_ricambi', 'movimenti_ricambi', 'preventivi', 'documenti',
    'log_modifiche', 'app_settings', 'user_permissions', 'auth_logs', 'segnalazioni',
    'support_notes', 'lavorazione_documents'
  )
group by schemaname, tablename
order by tablename;

-- 3) Helper RBAC presenti
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname like 'rbac_%'
order by proname;

-- 4) Colonna cliente_ref su profiles
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'cliente_ref';

-- 5) View lavorazioni_clienti
select table_name, is_insertable_into
from information_schema.views
where table_schema = 'public'
  and table_name = 'lavorazioni_clienti';

-- 6) Revoke anon (privilegi residui)
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name in ('lavorazioni', 'mezzi', 'profiles', 'magazzino_ricambi')
order by table_name, privilege_type;

-- 7) Helper enforcement user_permissions
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'user_effective_can',
    'rbac_module_can',
    'rbac_storage_documenti_path_allowed',
    'rbac_storage_images_path_allowed',
    'rbac_staff_has_any_module_write'
  )
order by proname;

-- 8) resolve_auth_email_for_login: anon non deve poter eseguire
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'resolve_auth_email_for_login'
order by grantee, privilege_type;

-- 9) rbac_role_for_user: authenticated non deve poter eseguire
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'rbac_role_for_user'
  and grantee = 'authenticated';

-- 10) Bucket documenti privato
select id, public from storage.buckets where id in ('documenti', 'images');

-- 11) Operative history: policies must not be USING(true)
select schemaname, tablename, policyname, qual::text as using_expr
from pg_policies
where schemaname = 'public'
  and tablename in ('operative_history_cases', 'operative_history_signals')
  and (qual::text = 'true' or qual is null)
order by tablename, policyname;

-- 12) TKB draft store: staff-only (not cliente)
select schemaname, tablename, policyname, qual::text as using_expr
from pg_policies
where schemaname = 'public'
  and tablename = 'tkb_draft_store'
  and qual::text not like '%rbac_is_cliente%'
order by policyname;

-- 13) security_assert_* helpers exist
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname like 'security_assert_%'
order by proname;

-- 14) anon EXECUTE on SECURITY DEFINER (expect 0 post-remediation)
select count(*) as anon_security_definer_execute_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and has_function_privilege('anon', p.oid, 'EXECUTE');
