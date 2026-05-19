-- Verifica RBAC enterprise (post-refactor)

-- Policy uniformi rbac_* per tabella
select tablename, count(*) as policy_count,
  string_agg(distinct cmd, ', ' order by cmd) as commands
from pg_policies
where schemaname = 'public'
  and policyname like 'rbac\_%' escape '\'
group by tablename
order by tablename;

-- log_modifiche: nessuna policy UPDATE
select count(*) as update_policies_on_log
from pg_policies
where schemaname = 'public'
  and tablename = 'log_modifiche'
  and cmd = 'UPDATE';

-- Funzioni RBAC core
select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname in (
  'rbac_role', 'rbac_can_read', 'rbac_can_write', 'rbac_can_delete',
  'rbac_scope_cliente', 'rbac_is_cliente', 'rbac_auth_uid'
)
order by proname;

-- Storage: 8 policy rbac_storage_* (4 per bucket)
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

select count(*) as storage_policy_count
from pg_policies
where schemaname = 'storage' and tablename = 'objects';

select count(*) as policies_with_folder_parsing
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and (
    coalesce(qual, '') ilike '%foldername%'
    or coalesce(with_check, '') ilike '%foldername%'
  );
