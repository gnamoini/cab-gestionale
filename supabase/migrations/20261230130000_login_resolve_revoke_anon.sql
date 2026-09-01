-- Login: resolve_auth_email_for_login solo service_role (anti-enumerazione anon).
-- Post-manifest fix: sovrascrive re-grant anon in 20261226120201.
-- CREATE OR REPLACE non resetta grant — REVOKE esplicito dopo eventuali replace futuri.

revoke execute on function public.resolve_auth_email_for_login(text) from public, anon, authenticated;
grant execute on function public.resolve_auth_email_for_login(text) to service_role;

comment on function public.resolve_auth_email_for_login(text) is
  'Risoluzione username→email per login. Solo service_role via Server Action; anon revocato (20261230130000).';
