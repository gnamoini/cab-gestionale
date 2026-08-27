-- Fix: security_assert_service_role bloccava catene trigger-internal.
-- Esempio: lavorazioni UPDATE → cab_enqueue_notification_outbox → INSERT notification_outbox
-- → trg_notification_outbox_invoke_worker → cab_invoke_notification_outbox_worker.
-- Il guard in 20261226120500 controlla session_user (authenticated via PostgREST), non il DEFINER.

create or replace function public.security_assert_service_role()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ponytail: trigger-internal DEFINER chains (outbox invoke, log prune, …)
  if pg_trigger_depth() > 0 then
    return;
  end if;

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
