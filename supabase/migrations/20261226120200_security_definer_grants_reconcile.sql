-- Security remediation v2: security_assert helpers (grants in 20261226120201 from manifest).

create or replace function public.security_assert_authenticated()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Non autenticato' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.security_assert_service_role()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return;
  end if;
  if current_setting('role', true) = 'service_role' then
    return;
  end if;
  if session_user in ('postgres', 'supabase_admin', 'service_role') then
    return;
  end if;
  raise exception 'Permesso negato: service_role richiesto' using errcode = '42501';
end;
$$;

revoke all on function public.security_assert_authenticated() from public, anon, authenticated, service_role;
revoke all on function public.security_assert_service_role() from public, anon, authenticated, service_role;

-- EXECUTE grants: see 20261226120201_security_definer_grants_from_manifest.sql (manifest SSOT).
