-- Verifica RBAC capability (post-refactor)

-- Funzione centrale
select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname = 'rbac_has_capability';

-- Policy capability-centric cap_*
select tablename, count(*) as policy_count,
  string_agg(distinct cmd, ', ' order by cmd) as commands
from pg_policies
where schemaname = 'public'
  and policyname like 'cap\_%' escape '\'
group by tablename
order by tablename;

-- Nessuna policy rbac_* residua su tabelle operative
select count(*) as legacy_rbac_policies
from pg_policies
where schemaname = 'public'
  and policyname like 'rbac\_%' escape '\'
  and tablename in (
    'profiles', 'mezzi', 'lavorazioni', 'scheda_lavorazione',
    'magazzino_ricambi', 'movimenti_ricambi', 'preventivi', 'documenti',
    'log_modifiche', 'segnalazioni', 'app_settings', 'app_settings_audit',
    'user_permissions', 'auth_logs'
  );

-- log_modifiche: nessuna policy UPDATE
select count(*) as update_policies_on_log
from pg_policies
where schemaname = 'public'
  and tablename = 'log_modifiche'
  and cmd = 'UPDATE';

-- Storage: 8 policy cap_storage_* (4 per bucket)
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

select count(*) as storage_policy_count
from pg_policies
where schemaname = 'storage' and tablename = 'objects';

-- Smoke test capability mapping
select
  public.rbac_has_capability((select id from public.profiles where ruolo = 'admin' limit 1), 'can_manage_settings') as admin_settings,
  public.rbac_has_capability((select id from public.profiles where ruolo = 'operatore' limit 1), 'can_write_operational') as operatore_write,
  public.rbac_has_capability((select id from public.profiles where ruolo = 'operatore' limit 1), 'can_manage_settings') as operatore_settings;
