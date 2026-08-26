-- Security remediation v2: default EXECUTE ACL for new functions (SSOT).
-- New SECURITY DEFINER functions created by postgres/supabase_admin inherit deny-by-default for clients.

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- ponytail: hosted Supabase push role cannot alter supabase_admin defaults; skip when insufficient_privilege.
do $acl$
begin
  alter default privileges for role supabase_admin in schema public
    revoke execute on functions from public, anon, authenticated;
exception
  when insufficient_privilege then
    raise notice 'skip supabase_admin public function REVOKE defaults (insufficient_privilege)';
end
$acl$;

alter default privileges for role postgres in schema storage
  revoke execute on functions from public, anon, authenticated;

do $acl$
begin
  alter default privileges for role supabase_admin in schema storage
    revoke execute on functions from public, anon, authenticated;
exception
  when insufficient_privilege then
    raise notice 'skip supabase_admin storage function REVOKE defaults (insufficient_privilege)';
end
$acl$;

-- Worker / cron defaults: service_role only
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

do $acl$
begin
  alter default privileges for role supabase_admin in schema public
    grant execute on functions to service_role;
exception
  when insufficient_privilege then
    raise notice 'skip supabase_admin public function GRANT defaults (insufficient_privilege)';
end
$acl$;

alter default privileges for role postgres in schema storage
  grant execute on functions to service_role;

do $acl$
begin
  alter default privileges for role supabase_admin in schema storage
    grant execute on functions to service_role;
exception
  when insufficient_privilege then
    raise notice 'skip supabase_admin storage function GRANT defaults (insufficient_privilege)';
end
$acl$;
