-- Communication workers via pg_cron + pg_net (Vercel Hobby: no */5 vercel.json crons).

begin;

create extension if not exists pg_net with schema extensions;

create or replace function public.cab_invoke_communication_outbox_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.communication_outbox_worker_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/communication-outbox-processor'
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
exception when others then
  raise;
end;
$$;

create or replace function public.cab_invoke_communication_send_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url text := coalesce(
    nullif(current_setting('app.communication_send_worker_url', true), ''),
    'https://cab-gestionale.vercel.app/api/cron/communication-send-worker'
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
exception when others then
  raise;
end;
$$;

revoke all on function public.cab_invoke_communication_outbox_worker() from public;
grant execute on function public.cab_invoke_communication_outbox_worker() to service_role;

revoke all on function public.cab_invoke_communication_send_worker() from public;
grant execute on function public.cab_invoke_communication_send_worker() to service_role;

create or replace function public.trg_communication_outbox_invoke_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cab_invoke_communication_outbox_worker();
  return new;
end;
$$;

drop trigger if exists communication_outbox_invoke_worker on public.communication_outbox;
create trigger communication_outbox_invoke_worker
  after insert on public.communication_outbox
  for each row
  execute function public.trg_communication_outbox_invoke_worker();

create or replace function public.trg_communication_send_queue_invoke_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cab_invoke_communication_send_worker();
  return new;
end;
$$;

drop trigger if exists communication_send_queue_invoke_worker on public.communication_send_queue;
create trigger communication_send_queue_invoke_worker
  after insert on public.communication_send_queue
  for each row
  execute function public.trg_communication_send_queue_invoke_worker();

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'communication-outbox-poll';
    perform cron.schedule(
      'communication-outbox-poll',
      '*/2 * * * *',
      $cron$select public.cab_invoke_communication_outbox_worker();$cron$
    );
    perform cron.unschedule(jobid) from cron.job where jobname = 'communication-send-poll';
    perform cron.schedule(
      'communication-send-poll',
      '*/2 * * * *',
      $cron$select public.cab_invoke_communication_send_worker();$cron$
    );
  end if;
exception when others then
  null;
end;
$do$;

commit;
