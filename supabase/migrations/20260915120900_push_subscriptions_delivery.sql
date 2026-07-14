-- Web Push: subscriptions multi-tenant + delivery queue con retry.

begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint push_subscriptions_company_endpoint_uidx unique (company_id, endpoint)
);

create index if not exists push_subscriptions_user_active_idx
  on public.push_subscriptions (user_id)
  where revoked_at is null;

create table if not exists public.push_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'dead_letter')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint push_delivery_queue_notification_uidx unique (notification_id)
);

create index if not exists push_delivery_queue_claim_idx
  on public.push_delivery_queue (next_attempt_at)
  where status in ('pending', 'failed') and attempts < max_attempts;

alter table public.push_subscriptions enable row level security;
alter table public.push_delivery_queue enable row level security;

revoke all on public.push_subscriptions from public, anon, authenticated;
revoke all on public.push_delivery_queue from public, anon, authenticated;

-- ── RPC: upsert subscription (company da profilo utente) ──
create or replace function public.cab_upsert_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_endpoint is null or char_length(trim(p_endpoint)) < 8 then
    raise exception 'invalid_endpoint';
  end if;

  select p.company_id into v_company_id
  from public.profiles p
  where p.id = v_uid;

  if v_company_id is null then
    raise exception 'company_not_configured';
  end if;

  insert into public.push_subscriptions (
    user_id, company_id, endpoint, p256dh, auth, user_agent, last_seen_at, revoked_at
  ) values (
    v_uid, v_company_id, trim(p_endpoint), trim(p_p256dh), trim(p_auth), nullif(trim(p_user_agent), ''), now(), null
  )
  on conflict (company_id, endpoint) do update set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = coalesce(excluded.user_agent, public.push_subscriptions.user_agent),
    last_seen_at = now(),
    revoked_at = null
  returning id into v_id;

  return v_id;
end;
$$;

-- ── RPC: revoke subscription ──
create or replace function public.cab_revoke_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select p.company_id into v_company_id
  from public.profiles p
  where p.id = v_uid;

  if v_company_id is null then
    return false;
  end if;

  update public.push_subscriptions
  set revoked_at = now()
  where company_id = v_company_id
    and endpoint = trim(p_endpoint)
    and user_id = v_uid
    and revoked_at is null;

  return found;
end;
$$;

-- ── RPC: enqueue delivery (service / trigger) ──
create or replace function public.cab_enqueue_push_delivery(p_notification_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_notification_id is null then
    raise exception 'notification_id_required';
  end if;

  insert into public.push_delivery_queue (notification_id)
  values (p_notification_id)
  on conflict (notification_id) do nothing
  returning id into v_id;

  if v_id is null then
    select q.id into v_id
    from public.push_delivery_queue q
    where q.notification_id = p_notification_id;
  end if;

  return v_id;
end;
$$;

-- ── RPC: claim batch (edge / service role) ──
create or replace function public.cab_claim_push_delivery_batch(p_limit int default 10)
returns setof public.push_delivery_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select q.id
    from public.push_delivery_queue q
    where q.status in ('pending', 'failed')
      and q.attempts < q.max_attempts
      and q.next_attempt_at <= now()
    order by q.next_attempt_at asc
    limit greatest(1, least(coalesce(p_limit, 10), 50))
    for update skip locked
  )
  update public.push_delivery_queue q
  set status = 'processing',
      attempts = q.attempts + 1
  from candidates c
  where q.id = c.id
  returning q.*;
end;
$$;

-- ── RPC: mark delivery result ──
create or replace function public.cab_complete_push_delivery(
  p_delivery_id uuid,
  p_success boolean,
  p_error text default null,
  p_retry_delay_seconds int default 60
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.push_delivery_queue%rowtype;
  v_delay int := greatest(coalesce(p_retry_delay_seconds, 60), 30);
begin
  select * into v_row from public.push_delivery_queue where id = p_delivery_id;
  if not found then
    return;
  end if;

  if p_success then
    update public.push_delivery_queue
    set status = 'sent',
        processed_at = now(),
        last_error = null
    where id = p_delivery_id;
    return;
  end if;

  if v_row.attempts >= v_row.max_attempts then
    update public.push_delivery_queue
    set status = 'dead_letter',
        processed_at = now(),
        last_error = left(coalesce(p_error, 'unknown'), 2000)
    where id = p_delivery_id;
    return;
  end if;

  update public.push_delivery_queue
  set status = 'failed',
      last_error = left(coalesce(p_error, 'unknown'), 2000),
      next_attempt_at = now() + make_interval(secs => v_delay * power(2, greatest(v_row.attempts - 1, 0))::int)
  where id = p_delivery_id;
end;
$$;

-- ── Trigger: enqueue on notification insert ──
create or replace function public.trg_notifications_enqueue_push_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cab_enqueue_push_delivery(new.id);
  return new;
end;
$$;

drop trigger if exists notifications_enqueue_push_delivery on public.notifications;
create trigger notifications_enqueue_push_delivery
  after insert on public.notifications
  for each row
  execute function public.trg_notifications_enqueue_push_delivery();

revoke all on function public.cab_upsert_push_subscription(text, text, text, text) from public;
grant execute on function public.cab_upsert_push_subscription(text, text, text, text) to authenticated;

revoke all on function public.cab_revoke_push_subscription(text) from public;
grant execute on function public.cab_revoke_push_subscription(text) to authenticated;

revoke all on function public.cab_enqueue_push_delivery(uuid) from public;
revoke all on function public.cab_claim_push_delivery_batch(int) from public;
grant execute on function public.cab_claim_push_delivery_batch(int) to service_role;

revoke all on function public.cab_complete_push_delivery(uuid, boolean, text, int) from public;
grant execute on function public.cab_complete_push_delivery(uuid, boolean, text, int) to service_role;

comment on table public.push_subscriptions is 'Web Push subscriptions per utente/azienda — accesso via RPC.';
comment on table public.push_delivery_queue is 'Coda invio push con retry/backoff — processata da Edge Function.';

commit;
