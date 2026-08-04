-- Communication Platform Layer: outbox, send queue, log, policies, templates, preferences.

begin;

-- ── communication_outbox ──
create table if not exists public.communication_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  domain_event_type text not null,
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

create index if not exists communication_outbox_claim_idx
  on public.communication_outbox (created_at)
  where status in ('pending', 'processing');

alter table public.communication_outbox enable row level security;
revoke all on public.communication_outbox from public, anon, authenticated;

-- ── communication_log ──
create table if not exists public.communication_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  domain_event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  cliente_id uuid references public.clienti_anagrafiche (id) on delete set null,
  communication_target_type text not null
    check (communication_target_type in ('customer', 'supplier', 'internal', 'system')),
  template_key text not null,
  template_version int not null default 1,
  rendered_payload jsonb not null default '{}'::jsonb,
  subject text not null default '',
  intended_recipient_email text,
  intended_recipient_name text,
  actual_recipient_email text,
  test_mode_active boolean not null default false,
  client_send_enabled boolean not null default false,
  dry_run boolean not null default false,
  attachment_refs jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in (
      'pending', 'simulated', 'sent', 'delivered', 'bounced', 'failed', 'skipped'
    )),
  error_message text,
  retry_count int not null default 0,
  message_id text,
  duration_ms int,
  idempotency_key text not null,
  unique (idempotency_key)
);

create index if not exists communication_log_cliente_idx
  on public.communication_log (cliente_id, created_at desc)
  where cliente_id is not null;

create index if not exists communication_log_created_idx
  on public.communication_log (created_at desc);

create index if not exists communication_log_message_id_idx
  on public.communication_log (message_id)
  where message_id is not null;

alter table public.communication_log enable row level security;
revoke all on public.communication_log from public, anon, authenticated;

-- ── communication_send_queue ──
create table if not exists public.communication_send_queue (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.communication_log (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'dead_letter')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (log_id)
);

create index if not exists communication_send_queue_claim_idx
  on public.communication_send_queue (next_attempt_at)
  where status in ('pending', 'failed') and attempts < max_attempts;

alter table public.communication_send_queue enable row level security;
revoke all on public.communication_send_queue from public, anon, authenticated;

-- ── communication_templates ──
create table if not exists public.communication_templates (
  template_key text not null,
  version int not null default 1,
  subject_template text not null default '',
  body_template text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (template_key, version)
);

alter table public.communication_templates enable row level security;
revoke all on public.communication_templates from public, anon, authenticated;

-- ── communication_policies ──
create table if not exists public.communication_policies (
  event_type text primary key,
  enabled boolean not null default true,
  allowed_channels jsonb not null default '["email"]'::jsonb,
  recipient_type text not null
    check (recipient_type in ('customer', 'supplier', 'internal', 'system')),
  conditions jsonb not null default '{}'::jsonb,
  template_key text not null,
  attachment_types jsonb not null default '[]'::jsonb,
  updated_at timestamptz,
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.communication_policies enable row level security;
revoke all on public.communication_policies from public, anon, authenticated;

-- ── cliente_communication_preferences ──
create table if not exists public.cliente_communication_preferences (
  cliente_id uuid primary key references public.clienti_anagrafiche (id) on delete cascade,
  receive_work_order_updates boolean not null default true,
  receive_quotes boolean not null default true,
  receive_maintenance_reminders boolean not null default true,
  updated_at timestamptz,
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.cliente_communication_preferences enable row level security;
revoke all on public.cliente_communication_preferences from public, anon, authenticated;

-- ── Enqueue ──
create or replace function public.cab_enqueue_communication_outbox(
  p_domain_event_type text,
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
  if p_domain_event_type is null or p_entity_type is null
     or p_entity_id is null or p_idempotency_key is null
     or char_length(trim(p_idempotency_key)) < 8 then
    return null;
  end if;

  v_company := p_company_id;
  if v_company is null then
    select c.id into v_company from public.companies c limit 1;
  end if;

  insert into public.communication_outbox (
    company_id,
    domain_event_type,
    entity_type,
    entity_id,
    actor_id,
    payload,
    idempotency_key,
    status
  ) values (
    v_company,
    trim(p_domain_event_type),
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

revoke all on function public.cab_enqueue_communication_outbox(text, text, uuid, text, uuid, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.cab_enqueue_communication_outbox(text, text, uuid, text, uuid, jsonb, uuid)
  to service_role;

-- ── Claim outbox batch ──
create or replace function public.cab_claim_communication_outbox_batch(p_limit int default 20)
returns setof public.communication_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select o.id
    from public.communication_outbox o
    where o.status = 'pending'
      and o.attempt_count < o.max_attempts
    order by o.created_at asc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    for update skip locked
  )
  update public.communication_outbox o
  set status = 'processing',
      attempt_count = o.attempt_count + 1
  from picked
  where o.id = picked.id
  returning o.*;
end;
$$;

revoke all on function public.cab_claim_communication_outbox_batch(int) from public, anon, authenticated;
grant execute on function public.cab_claim_communication_outbox_batch(int) to service_role;

-- ── Complete outbox ──
create or replace function public.cab_complete_communication_outbox(
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
  update public.communication_outbox
  set status = case
        when p_status in ('completed', 'failed') then p_status
        else status
      end,
      processed_at = now(),
      error_message = left(coalesce(p_error, error_message), 500)
  where id = p_outbox_id;
end;
$$;

revoke all on function public.cab_complete_communication_outbox(uuid, text, text) from public, anon, authenticated;
grant execute on function public.cab_complete_communication_outbox(uuid, text, text) to service_role;

create or replace function public.cab_release_communication_outbox(
  p_outbox_id uuid,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.communication_outbox
  set status = 'pending',
      error_message = left(coalesce(p_error, error_message), 500)
  where id = p_outbox_id
    and status = 'processing';
end;
$$;

revoke all on function public.cab_release_communication_outbox(uuid, text) from public, anon, authenticated;
grant execute on function public.cab_release_communication_outbox(uuid, text) to service_role;

-- ── Claim send queue ──
create or replace function public.cab_claim_communication_send_batch(p_limit int default 20)
returns setof public.communication_send_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select q.id
    from public.communication_send_queue q
    where q.status in ('pending', 'failed')
      and q.attempts < q.max_attempts
      and q.next_attempt_at <= now()
    order by q.next_attempt_at asc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    for update skip locked
  )
  update public.communication_send_queue q
  set status = 'processing',
      attempts = q.attempts + 1
  from picked
  where q.id = picked.id
  returning q.*;
end;
$$;

revoke all on function public.cab_claim_communication_send_batch(int) from public, anon, authenticated;
grant execute on function public.cab_claim_communication_send_batch(int) to service_role;

-- ── Complete send queue ──
create or replace function public.cab_complete_communication_send(
  p_queue_id uuid,
  p_status text,
  p_error text default null,
  p_next_attempt_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.communication_send_queue
  set status = case
        when p_status in ('sent', 'failed', 'dead_letter', 'pending') then p_status
        else status
      end,
      processed_at = case when p_status = 'sent' then now() else processed_at end,
      last_error = left(coalesce(p_error, last_error), 500),
      next_attempt_at = coalesce(p_next_attempt_at, next_attempt_at)
  where id = p_queue_id;
end;
$$;

revoke all on function public.cab_complete_communication_send(uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.cab_complete_communication_send(uuid, text, text, timestamptz)
  to service_role;

-- ── Lavorazioni triggers: fan-out communication ──
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

  perform public.cab_enqueue_communication_outbox(
    'work_order.created',
    'lavorazioni',
    new.id,
    'comm:work_order.created:lavorazioni:' || new.id::text,
    new.created_by,
    '{}'::jsonb,
    null
  );

  return new;
end;
$$;

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

  perform public.cab_enqueue_communication_outbox(
    'work_order.completed',
    'lavorazioni',
    new.id,
    'comm:work_order.completed:lavorazioni:' || new.id::text,
    coalesce(new.updated_by, new.created_by),
    jsonb_build_object('prev_stato', old.stato::text, 'curr_stato', new.stato::text),
    null
  );

  return new;
end;
$$;

-- ── Preventivi: status change → communication outbox ──
create or replace function public.trg_preventivi_communication_outbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.stato is not distinct from new.stato then
    return new;
  end if;

  perform public.cab_enqueue_communication_outbox(
    'preventivo.status_changed',
    'preventivi',
    new.id,
    'comm:preventivo.status_changed:preventivi:' || new.id::text || ':' || new.stato::text,
    null,
    jsonb_build_object('from', old.stato::text, 'to', new.stato::text),
    null
  );

  return new;
end;
$$;

drop trigger if exists preventivi_communication_outbox on public.preventivi;
create trigger preventivi_communication_outbox
  after update of stato on public.preventivi
  for each row
  execute function public.trg_preventivi_communication_outbox();

comment on table public.communication_outbox is
  'Domain event outbox for customer/supplier communications. Parallel to notification_outbox.';

comment on table public.communication_log is
  'SSOT storico comunicazioni outbound. Body ricostruibile da template + rendered_payload.';

commit;
