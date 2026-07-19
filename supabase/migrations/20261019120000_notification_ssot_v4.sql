-- Notification SSOT v4: extended notifications, delivery_queue, delivery tracking, preferences.
-- Removes push enqueue DB trigger (delivery is application-layer).

begin;

-- ── Extend notifications ──
alter table public.notifications
  add column if not exists status text not null default 'CREATED'
    check (status in ('CREATED', 'VISIBLE', 'DELIVERING', 'DELIVERED', 'READ', 'ARCHIVED', 'EXPIRED')),
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists actor_id uuid references public.profiles (id) on delete set null,
  add column if not exists idempotency_key text,
  add column if not exists translation_key text,
  add column if not exists translation_params jsonb not null default '{}'::jsonb,
  add column if not exists snapshot jsonb not null default '{}'::jsonb,
  add column if not exists actions jsonb not null default '[]'::jsonb,
  add column if not exists payload_version text not null default 'v1',
  add column if not exists expires_at timestamptz,
  add column if not exists source_domain_event text,
  add column if not exists icon text,
  add column if not exists color text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists notifications_idempotency_key_uidx
  on public.notifications (idempotency_key)
  where idempotency_key is not null;

-- ── Registry overrides ──
alter table public.notification_type_registry
  add column if not exists channels_enabled jsonb,
  add column if not exists aggregation_override jsonb,
  add column if not exists default_ttl_days int;

-- ── Device capabilities + presence ──
alter table public.push_subscriptions
  add column if not exists browser text,
  add column if not exists platform text,
  add column if not exists device_label text,
  add column if not exists app_version text,
  add column if not exists subscription_version int not null default 1,
  add column if not exists presence_status text not null default 'OFFLINE'
    check (presence_status in ('ONLINE', 'AWAY', 'BACKGROUND', 'OFFLINE')),
  add column if not exists presence_updated_at timestamptz not null default now(),
  add column if not exists last_foreground_at timestamptz,
  add column if not exists supports_actions boolean not null default false,
  add column if not exists supports_badge boolean not null default true,
  add column if not exists supports_image boolean not null default false,
  add column if not exists supports_require_interaction boolean not null default false,
  add column if not exists supports_vibrate boolean not null default false;

-- ── delivery_queue (replaces push_delivery_queue) ──
create table if not exists public.delivery_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  recipient_id uuid references public.profiles (id) on delete cascade,
  channel text not null,
  job_phase text not null default 'raw' check (job_phase in ('raw', 'executive')),
  priority int not null default 50,
  scheduled_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'dead_letter')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  next_attempt_at timestamptz not null default now(),
  aggregation_key text,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists delivery_queue_raw_notification_uidx
  on public.delivery_queue (notification_id)
  where job_phase = 'raw';

create index if not exists delivery_queue_claim_idx
  on public.delivery_queue (next_attempt_at, priority desc)
  where status in ('pending', 'failed') and attempts < max_attempts;

alter table public.delivery_queue enable row level security;
revoke all on public.delivery_queue from public, anon, authenticated;

-- ── notification_delivery tracking ──
create table if not exists public.notification_delivery (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  recipient_id uuid references public.profiles (id) on delete set null,
  channel text not null,
  device_id uuid references public.push_subscriptions (id) on delete set null,
  provider text not null,
  status text not null default 'created'
    check (status in (
      'created', 'queued', 'sending', 'delivered', 'failed', 'retry',
      'expired', 'opened', 'dismissed', 'ignored'
    )),
  attempts int not null default 0,
  dispatch_ms int,
  render_ms int,
  provider_ms int,
  latency_ms int,
  error text,
  opened_at timestamptz,
  closed_at timestamptz,
  clicked_action text,
  dismissed_at timestamptz,
  ignored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_delivery_notification_idx
  on public.notification_delivery (notification_id);

alter table public.notification_delivery enable row level security;
revoke all on public.notification_delivery from public, anon, authenticated;

-- ── aggregation buffer ──
create table if not exists public.notification_aggregation_buffer (
  id uuid primary key default gen_random_uuid(),
  window_key text not null,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint notification_aggregation_buffer_window_notification_uidx unique (window_key, notification_id)
);

create index if not exists notification_aggregation_buffer_expires_idx
  on public.notification_aggregation_buffer (expires_at);

alter table public.notification_aggregation_buffer enable row level security;
revoke all on public.notification_aggregation_buffer from public, anon, authenticated;

-- ── capture log (QA) ──
create table if not exists public.notification_capture_log (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  delivery_plan_id uuid,
  channel text,
  resolved_payload jsonb not null,
  provider text not null default 'capture',
  created_at timestamptz not null default now()
);

alter table public.notification_capture_log enable row level security;
revoke all on public.notification_capture_log from public, anon, authenticated;

-- ── user preferences ──
create table if not exists public.notification_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  category text not null,
  push_enabled boolean not null default true,
  quiet_hours_start time default '22:00',
  quiet_hours_end time default '07:00',
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notification_preferences_upsert_own on public.notification_preferences;
create policy notification_preferences_upsert_own on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on public.notification_preferences to authenticated;

-- ── RPC: publish notification (persist only semantics + legacy compat) ──
create or replace function public.cab_publish_notification(
  p_type text,
  p_title text,
  p_body text,
  p_href text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_dedup_key text default null,
  p_idempotency_key text default null,
  p_translation_key text default null,
  p_translation_params jsonb default '{}'::jsonb,
  p_snapshot jsonb default '{}'::jsonb,
  p_actions jsonb default '[]'::jsonb,
  p_payload_version text default 'v1',
  p_expires_at timestamptz default null,
  p_source_domain_event text default null,
  p_actor_id uuid default null,
  p_priority text default null
)
returns table (id uuid, inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result record;
begin
  select * into v_result from public.cab_create_notification(
    p_type, p_title, p_body, p_href, p_entity_type, p_entity_id, p_dedup_key
  ) as t(id, inserted);

  if v_result.id is null then
    return query select null::uuid, false;
  end if;

  if v_result.inserted then
    update public.notifications n set
      status = 'CREATED',
      status_changed_at = now(),
      idempotency_key = coalesce(nullif(trim(p_idempotency_key), ''), n.idempotency_key),
      translation_key = coalesce(nullif(trim(p_translation_key), ''), n.translation_key),
      translation_params = coalesce(p_translation_params, n.translation_params),
      snapshot = coalesce(p_snapshot, n.snapshot),
      actions = coalesce(p_actions, n.actions),
      payload_version = coalesce(nullif(trim(p_payload_version), ''), n.payload_version),
      expires_at = coalesce(p_expires_at, n.expires_at),
      source_domain_event = coalesce(nullif(trim(p_source_domain_event), ''), n.source_domain_event),
      actor_id = coalesce(p_actor_id, n.actor_id),
      priority = coalesce(nullif(trim(p_priority), ''), n.priority)
    where n.id = v_result.id;
    perform public.cab_enqueue_raw_delivery(v_result.id);
  end if;

  return query select v_result.id, v_result.inserted;
end;
$$;

-- ── RPC: enqueue RAW delivery job ──
create or replace function public.cab_enqueue_raw_delivery(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_notification_id is null then
    return false;
  end if;

  if exists (
    select 1 from public.delivery_queue dq
    where dq.notification_id = p_notification_id and dq.job_phase = 'raw'
  ) then
    return true;
  end if;

  insert into public.delivery_queue (
    notification_id, channel, job_phase, priority, status
  ) values (
    p_notification_id, 'raw', 'raw', 50, 'pending'
  );

  return true;
end;
$$;

-- ── RPC: claim delivery queue batch ──
create or replace function public.cab_claim_delivery_queue_batch(
  p_job_phase text default 'raw',
  p_limit int default 20
)
returns setof public.delivery_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select dq.id
    from public.delivery_queue dq
    where dq.job_phase = p_job_phase
      and dq.status in ('pending', 'failed')
      and dq.attempts < dq.max_attempts
      and dq.next_attempt_at <= now()
    order by dq.priority desc, dq.next_attempt_at asc
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    for update skip locked
  )
  update public.delivery_queue dq
  set status = 'processing', attempts = dq.attempts + 1
  from picked
  where dq.id = picked.id
  returning dq.*;
end;
$$;

-- ── RPC: complete delivery queue item ──
create or replace function public.cab_complete_delivery_queue(
  p_queue_id uuid,
  p_success boolean,
  p_error text default null,
  p_retry_delay_seconds int default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.delivery_queue%rowtype;
begin
  select * into v_row from public.delivery_queue where id = p_queue_id;
  if not found then return false; end if;

  if p_success then
    update public.delivery_queue set
      status = 'sent', processed_at = now(), last_error = null
    where id = p_queue_id;
    return true;
  end if;

  if v_row.attempts >= v_row.max_attempts then
    update public.delivery_queue set
      status = 'dead_letter', last_error = p_error, processed_at = now()
    where id = p_queue_id;
  else
    update public.delivery_queue set
      status = 'failed',
      last_error = p_error,
      next_attempt_at = now() + make_interval(secs => greatest(coalesce(p_retry_delay_seconds, 60), 5))
    where id = p_queue_id;
  end if;

  return true;
end;
$$;

-- ── RPC: touch presence ──
create or replace function public.cab_touch_push_presence(
  p_endpoint text,
  p_presence_status text default 'ONLINE'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;

  update public.push_subscriptions ps set
    presence_status = upper(trim(p_presence_status)),
    presence_updated_at = now(),
    last_foreground_at = case when upper(trim(p_presence_status)) = 'ONLINE' then now() else ps.last_foreground_at end,
    last_seen_at = now()
  where ps.user_id = v_uid
    and ps.endpoint = trim(p_endpoint)
    and ps.revoked_at is null;

  return found;
end;
$$;

-- ── Fanout: enqueue raw after insert (mechanical only, no policy) ──
create or replace function public.cab_fanout_enqueue_raw_after_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cab_enqueue_raw_delivery(new.id);
  return new;
end;
$$;

-- Temporary: mechanical raw enqueue for DB-origin inserts (fanout) until server migration
drop trigger if exists trg_notifications_enqueue_raw_delivery on public.notifications;
create trigger trg_notifications_enqueue_raw_delivery
  after insert on public.notifications
  for each row
  execute function public.cab_fanout_enqueue_raw_after_notification();

-- ── Remove legacy push business trigger ──
drop trigger if exists trg_notifications_enqueue_push_delivery on public.notifications;

-- ── Grants ──
revoke all on function public.cab_publish_notification(
  text, text, text, text, text, uuid, text, text, text, jsonb, jsonb, jsonb, text, timestamptz, text, uuid, text
) from public;
grant execute on function public.cab_publish_notification(
  text, text, text, text, text, uuid, text, text, text, jsonb, jsonb, jsonb, text, timestamptz, text, uuid, text
) to authenticated;

revoke all on function public.cab_enqueue_raw_delivery(uuid) from public;
grant execute on function public.cab_enqueue_raw_delivery(uuid) to authenticated;

revoke all on function public.cab_claim_delivery_queue_batch(text, int) from public;
grant execute on function public.cab_claim_delivery_queue_batch(text, int) to service_role;

revoke all on function public.cab_complete_delivery_queue(uuid, boolean, text, int) from public;
grant execute on function public.cab_complete_delivery_queue(uuid, boolean, text, int) to service_role;

revoke all on function public.cab_touch_push_presence(text, text) from public;
grant execute on function public.cab_touch_push_presence(text, text) to authenticated;

comment on table public.delivery_queue is 'SSOT v4 delivery queue — raw + executive phases.';
comment on function public.cab_publish_notification is 'Persist notification + extended fields; delivery via enqueue raw.';

commit;
