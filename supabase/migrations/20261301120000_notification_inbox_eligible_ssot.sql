-- SSOT inbox eligibility + read/unread/dismiss guards (staff OR cliente + visibility).

begin;

create or replace function public.notification_inbox_eligible()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.notification_staff_inbox_eligible()
      or public.notification_cliente_inbox_eligible();
$$;

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
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.notification_inbox_eligible() then
    raise exception 'ERR_INBOX_NOT_ALLOWED';
  end if;

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
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.notification_inbox_eligible() then
    raise exception 'ERR_INBOX_NOT_ALLOWED';
  end if;

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
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.notification_inbox_eligible() then
    raise exception 'ERR_INBOX_NOT_ALLOWED';
  end if;

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

revoke all on function public.notification_inbox_eligible() from public, anon;
grant execute on function public.notification_inbox_eligible() to authenticated;

commit;
