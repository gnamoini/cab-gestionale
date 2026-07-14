-- Consumer coda push via pg_cron + pg_net (Vercel Hobby: cron Vercel max 1/giorno).
-- Secret in vault: push_delivery_cron_secret (Bearer per /api/cron/push-delivery).

begin;

create extension if not exists pg_net with schema extensions;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'push-delivery-poll';
    perform cron.schedule(
      'push-delivery-poll',
      '*/2 * * * *',
      $cron$select public.cab_invoke_push_delivery_worker();$cron$
    );
  end if;
exception when others then
  null;
end;
$do$;

create or replace function public.cab_invoke_push_delivery_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.push_delivery_worker_url', true), ''),
    'https://gestionale-cab.vercel.app/api/cron/push-delivery'
  );
begin
  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
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
end;
$$;

revoke all on function public.cab_invoke_push_delivery_worker() from public;
grant execute on function public.cab_invoke_push_delivery_worker() to service_role;

comment on function public.cab_invoke_push_delivery_worker() is
  'Invoca worker Vercel push-delivery; richiede vault secret push_delivery_cron_secret.';

create or replace function public.trg_push_delivery_queue_invoke_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cab_invoke_push_delivery_worker();
  return new;
end;
$$;

drop trigger if exists push_delivery_queue_invoke_worker on public.push_delivery_queue;
create trigger push_delivery_queue_invoke_worker
  after insert on public.push_delivery_queue
  for each row
  execute function public.trg_push_delivery_queue_invoke_worker();

commit;
