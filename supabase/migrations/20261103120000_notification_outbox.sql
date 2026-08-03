-- Notification outbox: DB triggers enqueue events only (no HTTP).
-- Server worker processes outbox → dispatchNotificationEvent.

begin;

-- ── Outbox table ──
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  notification_event_id text not null,
  entity_type text not null,
  entity_id uuid not null,
  actor_id uuid references public.profiles (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  trace_id uuid not null default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  attempt_count int not null default 0,
  max_attempts int not null default 5,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (idempotency_key)
);

create index if not exists notification_outbox_claim_idx
  on public.notification_outbox (created_at)
  where status in ('pending', 'processing');

alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from public, anon, authenticated;

-- ── trace_id on delivery tracking ──
alter table public.notification_delivery
  add column if not exists trace_id uuid;

create index if not exists notification_delivery_trace_idx
  on public.notification_delivery (trace_id)
  where trace_id is not null;

-- ── Worker invoke diagnostics (no silent return) ──
create table if not exists public.notification_worker_diagnostics (
  id uuid primary key default gen_random_uuid(),
  worker_name text not null,
  status text not null check (status in ('ok', 'skipped', 'error')),
  detail text,
  created_at timestamptz not null default now()
);

alter table public.notification_worker_diagnostics enable row level security;
revoke all on public.notification_worker_diagnostics from public, anon, authenticated;

-- ── Enqueue helper (trigger-safe, idempotent) ──
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
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.cab_enqueue_notification_outbox(text, text, uuid, text, uuid, jsonb, uuid) from public, anon, authenticated;

-- ── Claim batch for worker ──
create or replace function public.cab_claim_notification_outbox_batch(p_limit int default 20)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select o.id
    from public.notification_outbox o
    where o.status = 'pending'
      and o.attempt_count < o.max_attempts
    order by o.created_at asc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    for update skip locked
  )
  update public.notification_outbox o
  set status = 'processing',
      attempt_count = o.attempt_count + 1
  from picked
  where o.id = picked.id
  returning o.*;
end;
$$;

revoke all on function public.cab_claim_notification_outbox_batch(int) from public, anon, authenticated;
grant execute on function public.cab_claim_notification_outbox_batch(int) to service_role;

-- ── Complete / release ──
create or replace function public.cab_complete_notification_outbox(
  p_outbox_id uuid,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_outbox
  set status = case
        when p_status in ('completed', 'failed') then p_status
        else status
      end,
      processed_at = now(),
      error_message = left(coalesce(p_error, error_message), 500)
  where id = p_outbox_id;
end;
$$;

revoke all on function public.cab_complete_notification_outbox(uuid, text, text) from public, anon, authenticated;
grant execute on function public.cab_complete_notification_outbox(uuid, text, text) to service_role;

create or replace function public.cab_release_notification_outbox(
  p_outbox_id uuid,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_outbox
  set status = 'pending',
      error_message = left(coalesce(p_error, error_message), 500)
  where id = p_outbox_id
    and status = 'processing';
end;
$$;

revoke all on function public.cab_release_notification_outbox(uuid, text) from public, anon, authenticated;
grant execute on function public.cab_release_notification_outbox(uuid, text) to service_role;

-- ── Lavorazioni: created ──
create or replace function public.trg_lavorazioni_outbox_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null then
    return new;
  end if;

  perform public.cab_enqueue_notification_outbox(
    'lavorazioni.created',
    'lavorazioni',
    new.id,
    'lavorazioni.created:lavorazioni:' || new.id::text,
    new.created_by,
    '{}'::jsonb,
    null
  );

  return new;
end;
$$;

drop trigger if exists lavorazioni_outbox_created on public.lavorazioni;
create trigger lavorazioni_outbox_created
  after insert on public.lavorazioni
  for each row
  execute function public.trg_lavorazioni_outbox_created();

-- ── Lavorazioni: completed ──
create or replace function public.trg_lavorazioni_outbox_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null then
    return new;
  end if;

  if old.stato is not distinct from new.stato then
    return new;
  end if;

  if new.stato::text <> 'completata' then
    return new;
  end if;

  if old.stato::text = 'completata' then
    return new;
  end if;

  perform public.cab_enqueue_notification_outbox(
    'lavorazioni.completed',
    'lavorazioni',
    new.id,
    'lavorazioni.completed:lavorazioni:' || new.id::text,
    coalesce(new.updated_by, new.created_by),
    jsonb_build_object('prev_stato', old.stato::text, 'curr_stato', new.stato::text),
    null
  );

  return new;
end;
$$;

drop trigger if exists lavorazioni_outbox_completed on public.lavorazioni;
create trigger lavorazioni_outbox_completed
  after update on public.lavorazioni
  for each row
  execute function public.trg_lavorazioni_outbox_completed();

-- ── Magazzino: stock crossing ──
create or replace function public.trg_magazzino_outbox_stock_crossing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev numeric;
  v_curr numeric;
  v_key text;
begin
  if old.quantita is not distinct from new.quantita then
    return new;
  end if;

  v_prev := coalesce(old.quantita, 0);
  v_curr := coalesce(new.quantita, 0);
  v_key := 'magazzino.below_minimum:magazzino_ricambi:' || new.id::text || ':' || v_prev::text || '->' || v_curr::text;

  perform public.cab_enqueue_notification_outbox(
    'magazzino.below_minimum',
    'magazzino_ricambi',
    new.id,
    v_key,
    null,
    jsonb_build_object('prev_quantita', v_prev, 'curr_quantita', v_curr),
    null
  );

  return new;
end;
$$;

drop trigger if exists magazzino_outbox_stock_crossing on public.magazzino_ricambi;
create trigger magazzino_outbox_stock_crossing
  after update of quantita on public.magazzino_ricambi
  for each row
  execute function public.trg_magazzino_outbox_stock_crossing();

-- ── Push worker: log skipped invocations ──
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
    'https://cab-gestionale.vercel.app/api/cron/push-delivery'
  );
begin
  select ds.decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  where ds.name = 'push_delivery_cron_secret'
  limit 1;

  if v_secret is null or char_length(trim(v_secret)) < 8 then
    insert into public.notification_worker_diagnostics (worker_name, status, detail)
    values ('push_delivery', 'skipped', 'push_delivery_cron_secret missing or too short');
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
  values ('push_delivery', 'ok', 'invoke requested');
exception when others then
  insert into public.notification_worker_diagnostics (worker_name, status, detail)
  values ('push_delivery', 'error', left(SQLERRM, 500));
  raise;
end;
$$;

comment on table public.notification_outbox is
  'Domain event outbox for server-side notification fan-out. Triggers enqueue only; worker processes.';

commit;
