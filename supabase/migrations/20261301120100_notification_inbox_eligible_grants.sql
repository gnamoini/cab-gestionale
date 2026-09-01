-- Grants manifest-aligned for notification_inbox_eligible (AUTHENTICATED_CLIENT_CALLABLE).

begin;

revoke all on function public.notification_inbox_eligible() from public, anon, authenticated, service_role;
grant execute on function public.notification_inbox_eligible() to authenticated;

commit;
