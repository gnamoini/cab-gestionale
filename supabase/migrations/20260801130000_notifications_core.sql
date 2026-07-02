-- Inbox notifiche v2: registry strict, RLS visibility, RPC create/list/count/state.

begin;

-- ── Registry SSOT ──
create table if not exists public.notification_type_registry (
  type                  text primary key,
  allowed_scope_type    text not null check (allowed_scope_type in ('user', 'role', 'global')),
  allowed_scope_value   text not null,
  allowed_scope_module  text,
  default_priority      text not null check (default_priority in ('low', 'medium', 'high', 'urgent')),
  caller_min_role       text not null check (caller_min_role in ('staff', 'manager', 'self')),
  constraint notification_type_registry_module_check check (
    allowed_scope_module is null
    or allowed_scope_module in (
      'magazzino', 'preventivi', 'lavorazioni', 'mezzi', 'report',
      'documenti', 'dipendenti', 'fatturazione', 'ddt', 'ordini_fornitori'
    )
  )
);

insert into public.notification_type_registry (
  type, allowed_scope_type, allowed_scope_value, allowed_scope_module, default_priority, caller_min_role
) values
  ('lavorazione_created', 'role', 'operatore', 'lavorazioni', 'high', 'staff'),
  ('magazzino_sotto_scorta', 'role', 'operatore', 'magazzino', 'high', 'staff'),
  ('dipendenti_presenze_reminder', 'role', 'manager', 'dipendenti', 'medium', 'staff'),
  ('dashboard_promemoria_reminder', 'global', '__NULL__', null, 'medium', 'staff'),
  ('admin_dashboard_test', 'user', '__CALLER_UID__', null, 'low', 'self')
on conflict (type) do nothing;

revoke all on public.notification_type_registry from public, anon, authenticated;

-- ── Notifications ──
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  type          text not null references public.notification_type_registry (type),
  scope_type    text not null check (scope_type in ('user', 'role', 'global')),
  scope_value   text,
  scope_module  text,
  priority      text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  title         text not null check (char_length(trim(title)) between 1 and 500),
  body          text not null check (char_length(trim(body)) between 1 and 2000),
  href          text,
  entity_type   text,
  entity_id     uuid,
  dedup_key     text not null,
  created_by    uuid references public.profiles (id) on delete set null,
  constraint notifications_scope_shape check (
    (scope_type = 'global' and scope_value is null)
    or (scope_type = 'user' and scope_value ~* '^[0-9a-f-]{36}$')
    or (scope_type = 'role' and scope_value in (
      'admin', 'manager', 'operatore', 'addetto_amministrativo'
    ))
  )
);

create unique index if not exists notifications_dedup_key_uidx on public.notifications (dedup_key);
create index if not exists notifications_inbox_cursor_idx
  on public.notifications (created_at desc, id desc);

-- ── Per-user state ──
create table if not exists public.notification_user_state (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  read_at         timestamptz,
  dismissed_at    timestamptz,
  primary key (notification_id, user_id)
);

create index if not exists notification_user_state_user_unread_idx
  on public.notification_user_state (user_id)
  where read_at is null and dismissed_at is null;

-- ── Visibility (SSOT) ──
create or replace function public.notification_staff_inbox_eligible()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_can_read_operational()
     and public.rbac_role() not in ('cliente', 'guest');
$$;

create or replace function public.notification_visible_to_auth_user(p_n public.notifications)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.notification_staff_inbox_eligible()
    and (
      public.rbac_role() in ('admin', 'manager')
      or p_n.scope_type = 'global'
      or (p_n.scope_type = 'user' and p_n.scope_value = auth.uid()::text)
      or (
        p_n.scope_type = 'role'
        and p_n.scope_value = public.rbac_role()
        and public.user_effective_can(p_n.scope_module, 'read')
      )
    );
$$;

create or replace function public.notification_priority_rank(p_priority text)
returns int
language sql
immutable
as $$
  select case p_priority
    when 'urgent' then 4
    when 'high' then 3
    when 'medium' then 2
    else 1
  end;
$$;

-- ── RLS ──
alter table public.notifications enable row level security;
alter table public.notification_user_state enable row level security;

drop policy if exists notifications_select_visible on public.notifications;
create policy notifications_select_visible on public.notifications
  for select to authenticated
  using (public.notification_visible_to_auth_user(notifications));

drop policy if exists nus_select_own on public.notification_user_state;
create policy nus_select_own on public.notification_user_state
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists nus_insert_own on public.notification_user_state;
create policy nus_insert_own on public.notification_user_state
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.notifications n
      where n.id = notification_id
        and public.notification_visible_to_auth_user(n)
    )
  );

drop policy if exists nus_update_own on public.notification_user_state;
create policy nus_update_own on public.notification_user_state
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
revoke all on public.notification_user_state from public, anon, authenticated;
grant select, insert, update on public.notification_user_state to authenticated;

-- ── RPC: create (strict registry) ──
create or replace function public.cab_create_notification(
  p_type text,
  p_title text,
  p_body text,
  p_href text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_dedup_key text default null
)
returns table (id uuid, inserted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_reg public.notification_type_registry%rowtype;
  v_scope_type text;
  v_scope_value text;
  v_scope_module text;
  v_priority text;
  v_new_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not public.notification_staff_inbox_eligible() then
    if public.rbac_role() = 'guest' then
      raise exception 'ERR_GUEST_NOT_ALLOWED';
    end if;
    raise exception 'ERR_CLIENTE_NOT_ALLOWED';
  end if;

  select * into v_reg from public.notification_type_registry where type = p_type;
  if not found then
    raise exception 'ERR_TYPE_NOT_ALLOWED';
  end if;

  v_role := public.rbac_role();

  if v_reg.caller_min_role = 'self' then
    if p_type <> 'admin_dashboard_test' then
      raise exception 'ERR_CALLER_ROLE_DENIED';
    end if;
  elsif v_reg.caller_min_role = 'manager' then
    if v_role not in ('admin', 'manager') then
      raise exception 'ERR_CALLER_ROLE_DENIED';
    end if;
  elsif v_reg.caller_min_role = 'staff' then
    if v_role not in ('admin', 'manager', 'operatore', 'addetto_amministrativo') then
      raise exception 'ERR_CALLER_ROLE_DENIED';
    end if;
  else
    raise exception 'ERR_CALLER_ROLE_DENIED';
  end if;

  if p_dedup_key is null or char_length(trim(p_dedup_key)) < 8 then
    raise exception 'ERR_DEDUP_KEY_INVALID';
  end if;

  if p_title is null or char_length(trim(p_title)) < 1 or char_length(trim(p_title)) > 500 then
    raise exception 'ERR_TITLE_INVALID';
  end if;

  if p_body is null or char_length(trim(p_body)) < 1 or char_length(trim(p_body)) > 2000 then
    raise exception 'ERR_BODY_INVALID';
  end if;

  v_scope_type := v_reg.allowed_scope_type;
  v_scope_module := v_reg.allowed_scope_module;
  v_priority := v_reg.default_priority;

  if v_reg.allowed_scope_value = '__CALLER_UID__' then
    v_scope_value := v_uid::text;
  elsif v_reg.allowed_scope_value = '__NULL__' then
    v_scope_value := null;
  else
    v_scope_value := v_reg.allowed_scope_value;
  end if;

  insert into public.notifications (
    type, scope_type, scope_value, scope_module, priority,
    title, body, href, entity_type, entity_id, dedup_key, created_by
  ) values (
    p_type, v_scope_type, v_scope_value, v_scope_module, v_priority,
    trim(p_title), trim(p_body), nullif(trim(p_href), ''), p_entity_type, p_entity_id,
    trim(p_dedup_key), v_uid
  )
  on conflict (dedup_key) do nothing
  returning notifications.id into v_new_id;

  if v_new_id is not null then
    return query select v_new_id, true;
  else
    select n.id into v_new_id from public.notifications n where n.dedup_key = trim(p_dedup_key);
    return query select v_new_id, false;
  end if;
end;
$$;

-- ── RPC: unread count ──
create or replace function public.cab_count_unread_notifications()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.notifications n
  where public.notification_visible_to_auth_user(n)
    and not exists (
      select 1
      from public.notification_user_state s
      where s.notification_id = n.id
        and s.user_id = auth.uid()
        and (s.read_at is not null or s.dismissed_at is not null)
    );
$$;

-- ── RPC: list inbox (cursor pagination) ──
create or replace function public.cab_list_notifications_inbox(
  p_limit int default 50,
  p_cursor_priority_rank int default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  id uuid,
  created_at timestamptz,
  type text,
  scope_type text,
  scope_value text,
  scope_module text,
  priority text,
  priority_rank int,
  title text,
  body text,
  href text,
  entity_type text,
  entity_id uuid,
  dedup_key text,
  created_by uuid,
  read_at timestamptz,
  dismissed_at timestamptz,
  is_unread boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    n.created_at,
    n.type,
    n.scope_type,
    n.scope_value,
    n.scope_module,
    n.priority,
    public.notification_priority_rank(n.priority) as priority_rank,
    n.title,
    n.body,
    n.href,
    n.entity_type,
    n.entity_id,
    n.dedup_key,
    n.created_by,
    s.read_at,
    s.dismissed_at,
    (s.read_at is null and s.dismissed_at is null) as is_unread
  from public.notifications n
  left join public.notification_user_state s
    on s.notification_id = n.id and s.user_id = auth.uid()
  where public.notification_visible_to_auth_user(n)
    and (s.dismissed_at is null)
    and (
      p_cursor_id is null
      or (
        public.notification_priority_rank(n.priority),
        n.created_at,
        n.id
      ) < (
        coalesce(p_cursor_priority_rank, 999),
        p_cursor_created_at,
        p_cursor_id
      )
    )
  order by
    public.notification_priority_rank(n.priority) desc,
    n.created_at desc,
    n.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- ── RPC: mark read ──
create or replace function public.cab_mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n public.notifications%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.notification_staff_inbox_eligible() then raise exception 'ERR_INBOX_NOT_ALLOWED'; end if;

  select * into v_n from public.notifications where id = p_notification_id;
  if not found or not public.notification_visible_to_auth_user(v_n) then
    raise exception 'ERR_NOTIFICATION_NOT_VISIBLE';
  end if;

  insert into public.notification_user_state (notification_id, user_id, read_at)
  values (p_notification_id, v_uid, now())
  on conflict (notification_id, user_id)
  do update set read_at = coalesce(notification_user_state.read_at, excluded.read_at);

  return true;
end;
$$;

-- ── RPC: mark all read (batch) ──
create or replace function public.cab_mark_all_notifications_read(p_max int default 200)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.notification_staff_inbox_eligible() then raise exception 'ERR_INBOX_NOT_ALLOWED'; end if;

  with candidates as (
    select n.id
    from public.notifications n
    where public.notification_visible_to_auth_user(n)
      and not exists (
        select 1 from public.notification_user_state s
        where s.notification_id = n.id and s.user_id = v_uid and s.read_at is not null
      )
    order by n.created_at desc
    limit least(greatest(coalesce(p_max, 200), 1), 500)
  ),
  upserted as (
    insert into public.notification_user_state (notification_id, user_id, read_at)
    select c.id, v_uid, now() from candidates c
    on conflict (notification_id, user_id)
    do update set read_at = coalesce(notification_user_state.read_at, excluded.read_at)
    returning 1
  )
  select count(*)::int into v_count from upserted;

  return coalesce(v_count, 0);
end;
$$;

-- ── RPC: dismiss ──
create or replace function public.cab_dismiss_notification(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n public.notifications%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.notification_staff_inbox_eligible() then raise exception 'ERR_INBOX_NOT_ALLOWED'; end if;

  select * into v_n from public.notifications where id = p_notification_id;
  if not found or not public.notification_visible_to_auth_user(v_n) then
    raise exception 'ERR_NOTIFICATION_NOT_VISIBLE';
  end if;

  insert into public.notification_user_state (notification_id, user_id, read_at, dismissed_at)
  values (p_notification_id, v_uid, now(), now())
  on conflict (notification_id, user_id)
  do update set
    read_at = coalesce(notification_user_state.read_at, now()),
    dismissed_at = now();

  return true;
end;
$$;

-- ── Grants RPC ──
revoke all on function public.notification_staff_inbox_eligible() from public;
revoke all on function public.notification_visible_to_auth_user(public.notifications) from public;
revoke all on function public.notification_priority_rank(text) from public;
revoke all on function public.cab_create_notification(text, text, text, text, text, uuid, text) from public;
revoke all on function public.cab_count_unread_notifications() from public;
revoke all on function public.cab_list_notifications_inbox(int, int, timestamptz, uuid) from public;
revoke all on function public.cab_mark_notification_read(uuid) from public;
revoke all on function public.cab_mark_all_notifications_read(int) from public;
revoke all on function public.cab_dismiss_notification(uuid) from public;

grant execute on function public.notification_staff_inbox_eligible() to authenticated;
grant execute on function public.notification_visible_to_auth_user(public.notifications) to authenticated;
grant execute on function public.notification_priority_rank(text) to authenticated;
grant execute on function public.cab_create_notification(text, text, text, text, text, uuid, text) to authenticated;
grant execute on function public.cab_count_unread_notifications() to authenticated;
grant execute on function public.cab_list_notifications_inbox(int, int, timestamptz, uuid) to authenticated;
grant execute on function public.cab_mark_notification_read(uuid) to authenticated;
grant execute on function public.cab_mark_all_notifications_read(int) to authenticated;
grant execute on function public.cab_dismiss_notification(uuid) to authenticated;

-- ── Realtime ──
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

comment on table public.notifications is 'Inbox notifiche v2 — insert solo via cab_create_notification.';
comment on table public.notification_type_registry is 'SSOT scope/priority per notification type.';

commit;
