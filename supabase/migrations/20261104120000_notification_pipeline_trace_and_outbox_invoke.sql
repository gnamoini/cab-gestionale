-- Pipeline trace (evidence collection) + immediate outbox worker invoke (mirror push delivery).

begin;

create extension if not exists pg_net with schema extensions;

-- ── Structured pipeline trace ──
create table if not exists public.notification_pipeline_trace (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null,
  entity_id uuid,
  notification_event_id text,
  stage text not null,
  recipient_count int,
  notifications_created int,
  realtime_delivered boolean,
  client_received boolean,
  error text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notification_pipeline_trace_trace_idx
  on public.notification_pipeline_trace (trace_id, created_at);

create index if not exists notification_pipeline_trace_entity_idx
  on public.notification_pipeline_trace (entity_id, created_at desc)
  where entity_id is not null;

alter table public.notification_pipeline_trace enable row level security;
revoke all on public.notification_pipeline_trace from public, anon, authenticated;

create or replace function public.cab_log_notification_pipeline_trace(
  p_trace_id uuid,
  p_stage text,
  p_entity_id uuid default null,
  p_notification_event_id text default null,
  p_recipient_count int default null,
  p_notifications_created int default null,
  p_realtime_delivered boolean default null,
  p_client_received boolean default null,
  p_error text default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_trace_id is null or p_stage is null or char_length(trim(p_stage)) < 2 then
    return null;
  end if;

  insert into public.notification_pipeline_trace (
    trace_id,
    entity_id,
    notification_event_id,
    stage,
    recipient_count,
    notifications_created,
    realtime_delivered,
    client_received,
    error,
    meta
  ) values (
    p_trace_id,
    p_entity_id,
    nullif(trim(p_notification_event_id), ''),
    trim(p_stage),
    p_recipient_count,
    p_notifications_created,
    p_realtime_delivered,
    p_client_received,
    nullif(left(trim(p_error), 500), ''),
    coalesce(p_meta, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.cab_log_notification_pipeline_trace(uuid, text, uuid, text, int, int, boolean, boolean, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.cab_log_notification_pipeline_trace(uuid, text, uuid, text, int, int, boolean, boolean, text, jsonb)
  to service_role;

-- ── Log outbox enqueue in pipeline trace ──
create or replace function public.cab_enqueue_notification_outbox(
  p_notification_event_id text,
  p_entity_type text,
  p_entity_id uuid,
  p_idempotency_key text,
  p_actor_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_company_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_company uuid;
  v_trace_id uuid;
begin
  if p_notification_event_id is null or p_entity_type is null
     or p_entity_id is null or p_idempotency_key is null
     or char_length(trim(p_idempotency_key)) < 8 then
    return null;
  end if;

  v_company := p_company_id;
  if v_company is null then
    select c.id into v_company from public.companies c limit 1;
  end if;

  insert into public.notification_outbox (
    company_id,
    notification_event_id,
    entity_type,
    entity_id,
    actor_id,
    payload,
    idempotency_key,
    status
  ) values (
    v_company,
    trim(p_notification_event_id),
    trim(p_entity_type),
    p_entity_id,
    p_actor_id,
    coalesce(p_payload, '{}'::jsonb),
    trim(p_idempotency_key),
    'pending'
  )
  on conflict (idempotency_key) do nothing
  returning id, trace_id into v_id, v_trace_id;

  if v_id is not null then
    perform public.cab_log_notification_pipeline_trace(
      v_trace_id,
      'outbox_enqueued',
      p_entity_id,
      trim(p_notification_event_id),
      null,
      null,
      null,
      null,
      null,
      jsonb_build_object('outbox_id', v_id, 'entity_type', trim(p_entity_type))
    );
  end if;

  return v_id;
end;
$$;

-- ── Immediate outbox worker invoke (mirror push_delivery_queue_invoke_worker) ──
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

create or replace function public.trg_notification_outbox_invoke_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cab_invoke_notification_outbox_worker();
  return new;
end;
$$;

drop trigger if exists notification_outbox_invoke_worker on public.notification_outbox;
create trigger notification_outbox_invoke_worker
  after insert on public.notification_outbox
  for each row
  execute function public.trg_notification_outbox_invoke_worker();

comment on table public.notification_pipeline_trace is
  'Structured end-to-end notification pipeline checkpoints keyed by trace_id.';

commit;
