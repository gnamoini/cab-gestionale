-- Outbox processor via pg_cron + pg_net (Vercel Hobby: cron Vercel max 1/giorno).
-- Reuses vault secret push_delivery_cron_secret (Bearer per /api/cron/notification-outbox-processor).

begin;

create extension if not exists pg_net with schema extensions;

create or replace function public.cab_invoke_notification_outbox_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.notification_outbox_worker_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/notification-outbox-processor'
  );
begin
  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
    insert into public.notification_worker_diagnostics (worker_name, status, detail)
    values ('notification_outbox', 'skipped', 'push_delivery_cron_secret missing or too short');
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(v_secret)
    ),
    body := '{}'::jsonb
  );

  insert into public.notification_worker_diagnostics (worker_name, status, detail)
  values ('notification_outbox', 'ok', 'invoke requested');
exception when others then
  insert into public.notification_worker_diagnostics (worker_name, status, detail)
  values ('notification_outbox', 'error', left(SQLERRM, 500));
  raise;
end;
$$;

revoke all on function public.cab_invoke_notification_outbox_worker() from public;
grant execute on function public.cab_invoke_notification_outbox_worker() to service_role;

comment on function public.cab_invoke_notification_outbox_worker() is
  'Invoca worker Vercel notification-outbox-processor; richiede vault secret push_delivery_cron_secret.';

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'notification-outbox-poll';
    perform cron.schedule(
      'notification-outbox-poll',
      '*/2 * * * *',
      $cron$select public.cab_invoke_notification_outbox_worker();$cron$
    );
  end if;
exception when others then
  null;
end;
$do$;

commit;
