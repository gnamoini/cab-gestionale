-- Notification event preferences SSOT + dispatch hardening (company scope, ledger, bulk dispatch).
-- Legacy notification_preferences (category-based) remains @deprecated — do not drop here.

begin;

-- ── company_id on notifications (multi-company idempotency) ──
alter table public.notifications
  add column if not exists company_id uuid references public.companies (id) on delete cascade;

update public.notifications n
set company_id = p.company_id
from public.profiles p
where n.company_id is null
  and (
    (n.scope_type = 'user' and n.scope_value = p.id::text)
    or n.created_by = p.id
  );

-- ponytail: righe senza profilo match restano null fino a backfill manuale

drop index if exists public.notifications_idempotency_key_uidx;
create unique index if not exists notifications_dispatch_idempotency_uidx
  on public.notifications (company_id, scope_type, scope_value, idempotency_key)
  where idempotency_key is not null;

create index if not exists notifications_inbox_user_company_idx
  on public.notifications (company_id, scope_value, created_at desc)
  where scope_type = 'user';

-- ── Per-user event preferences (lazy overrides) ──
create table if not exists public.notification_event_preferences (
  user_id               uuid not null references public.profiles (id) on delete cascade,
  company_id            uuid not null references public.companies (id) on delete cascade,
  notification_event_id text not null,
  enabled               boolean not null,
  updated_at            timestamptz not null default now(),
  primary key (user_id, company_id, notification_event_id)
);

create index if not exists idx_notification_event_preferences_user_company
  on public.notification_event_preferences (user_id, company_id);

create index if not exists idx_notification_event_preferences_event
  on public.notification_event_preferences (company_id, notification_event_id);

alter table public.notification_event_preferences enable row level security;

drop policy if exists notification_event_preferences_self on public.notification_event_preferences;
create policy notification_event_preferences_self on public.notification_event_preferences
  for all to authenticated
  using (
    user_id = auth.uid()
    and company_id = (select company_id from public.profiles where id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and company_id = (select company_id from public.profiles where id = auth.uid())
  );

grant select, insert, update, delete on public.notification_event_preferences to authenticated;

comment on table public.notification_event_preferences is
  'Preferenze notifiche per-evento (lazy). Assenza riga = default dal registry TS.';

-- Legacy table — deprecated, retained for quiet-hours until channel prefs migration
comment on table public.notification_preferences is
  '@deprecated Use notification_event_preferences. Scheduled for removal after consumer audit.';

-- ── Dispatch ledger (atomic fanout + idempotency) ──
create table if not exists public.notification_dispatch_log (
  id                             uuid primary key default gen_random_uuid(),
  company_id                     uuid not null references public.companies (id) on delete cascade,
  dispatch_notification_event_id text not null,
  dispatch_idempotency_key       text not null,
  status                         text not null check (status in ('pending', 'processing', 'completed', 'failed')),
  recipient_count                int not null default 0,
  created_count                  int not null default 0,
  error_message                  text,
  created_at                     timestamptz not null default now(),
  completed_at                   timestamptz,
  unique (company_id, dispatch_idempotency_key)
);

alter table public.notification_dispatch_log enable row level security;
revoke all on public.notification_dispatch_log from public, anon, authenticated;

-- ── Bulk dispatch RPC (service role only — atomic fanout per destinatario) ──
create or replace function public.cab_dispatch_notifications_bulk(
  p_company_id uuid,
  p_dispatch_notification_event_id text,
  p_dispatch_idempotency_key text,
  p_actor_id uuid,
  p_items jsonb
)
returns table (created_count int, duplicate boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_status text;
  v_item jsonb;
  v_recipient uuid;
  v_type text;
  v_title text;
  v_body text;
  v_href text;
  v_entity_type text;
  v_entity_id uuid;
  v_dedup_key text;
  v_idempotency_key text;
  v_translation_key text;
  v_translation_params jsonb;
  v_snapshot jsonb;
  v_source_domain_event text;
  v_priority text;
  v_reg public.notification_type_registry%rowtype;
  v_new_id uuid;
  v_inserted int := 0;
  v_scope_module text;
begin
  if p_company_id is null or p_dispatch_idempotency_key is null
     or char_length(trim(p_dispatch_idempotency_key)) < 8 then
    raise exception 'invalid_dispatch_params';
  end if;

  select ndl.status into v_existing_status
  from public.notification_dispatch_log ndl
  where ndl.company_id = p_company_id
    and ndl.dispatch_idempotency_key = trim(p_dispatch_idempotency_key);

  if v_existing_status = 'completed' then
    return query select 0, true;
    return;
  end if;

  if v_existing_status is null then
    insert into public.notification_dispatch_log (
      company_id, dispatch_notification_event_id, dispatch_idempotency_key, status
    ) values (
      p_company_id, p_dispatch_notification_event_id, trim(p_dispatch_idempotency_key), 'processing'
    );
  else
    update public.notification_dispatch_log
    set status = 'processing', error_message = null
    where company_id = p_company_id and dispatch_idempotency_key = trim(p_dispatch_idempotency_key);
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_recipient := (v_item->>'recipient_user_id')::uuid;
    v_type := nullif(trim(v_item->>'type'), '');
    v_title := nullif(trim(v_item->>'title'), '');
    v_body := nullif(trim(v_item->>'body'), '');
    v_href := nullif(trim(v_item->>'href'), '');
    v_entity_type := nullif(trim(v_item->>'entity_type'), '');
    v_entity_id := nullif(v_item->>'entity_id', '')::uuid;
    v_dedup_key := nullif(trim(v_item->>'dedup_key'), '');
    v_idempotency_key := nullif(trim(v_item->>'idempotency_key'), '');
    v_translation_key := coalesce(nullif(trim(v_item->>'translation_key'), ''), 'notification.generic');
    v_translation_params := coalesce(v_item->'translation_params', '{}'::jsonb);
    v_snapshot := coalesce(v_item->'snapshot', '{}'::jsonb);
    v_source_domain_event := nullif(trim(v_item->>'source_domain_event'), '');
    v_priority := nullif(trim(v_item->>'priority'), '');

    if v_recipient is null or v_type is null or v_dedup_key is null or v_idempotency_key is null then
      raise exception 'invalid_dispatch_item';
    end if;

    select * into v_reg from public.notification_type_registry where type = v_type;
    if not found then
      raise exception 'ERR_TYPE_NOT_ALLOWED';
    end if;

    v_scope_module := v_reg.allowed_scope_module;
    if v_priority is null then
      v_priority := v_reg.default_priority;
    end if;

    v_new_id := null;

    insert into public.notifications (
      company_id, type, scope_type, scope_value, scope_module, priority,
      title, body, href, entity_type, entity_id, dedup_key, created_by,
      idempotency_key, translation_key, translation_params, snapshot,
      source_domain_event, actor_id, status, status_changed_at
    ) values (
      p_company_id, v_type, 'user', v_recipient::text, v_scope_module, v_priority,
      coalesce(v_title, 'Notifica'), coalesce(v_body, '—'), v_href, v_entity_type, v_entity_id,
      v_dedup_key, p_actor_id, v_idempotency_key, v_translation_key, v_translation_params, v_snapshot,
      v_source_domain_event, p_actor_id, 'CREATED', now()
    )
    on conflict (dedup_key) do nothing
    returning id into v_new_id;

    if v_new_id is not null then
      perform public.cab_enqueue_raw_delivery(v_new_id);
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  update public.notification_dispatch_log
  set status = 'completed',
      recipient_count = jsonb_array_length(coalesce(p_items, '[]'::jsonb)),
      created_count = v_inserted,
      completed_at = now()
  where company_id = p_company_id and dispatch_idempotency_key = trim(p_dispatch_idempotency_key);

  return query select v_inserted, false;

exception when others then
  update public.notification_dispatch_log
  set status = 'failed',
      error_message = left(SQLERRM, 500),
      completed_at = now()
  where company_id = p_company_id and dispatch_idempotency_key = trim(p_dispatch_idempotency_key);
  raise;
end;
$$;

revoke all on function public.cab_dispatch_notifications_bulk(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.cab_dispatch_notifications_bulk(uuid, text, text, uuid, jsonb) to service_role;

comment on function public.cab_dispatch_notifications_bulk is
  'Atomic per-recipient notification fanout. Service role only. Idempotent via dispatch log + notification idempotency_key.';

commit;
