-- Agenda Officina (Planning): sessioni pianificate + audit history + RPC.

begin;

create table if not exists public.workshop_schedule_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null default 'intervento_programmato',
  block_type text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  planning_status text not null default 'scheduled',
  priority text,
  work_order_id uuid references public.lavorazioni (id) on delete set null,
  revision integer not null default 1,
  created_by uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  series_id uuid,
  recurrence_frequency text,
  recurrence_interval integer default 1,
  recurrence_until date,
  legacy_promemoria_id uuid,
  constraint wse_title_nonempty check (char_length(trim(title)) > 0),
  constraint wse_time_order check (start_at < end_at),
  constraint wse_max_duration check (extract(epoch from (end_at - start_at)) <= 24 * 60 * 60),
  constraint wse_event_type_check check (
    event_type in ('intervento_programmato', 'promemoria', 'appuntamento', 'blocco_agenda', 'altro')
  ),
  constraint wse_block_type_check check (
    block_type is null
    or block_type in ('ferie', 'chiusura', 'formazione', 'riunione', 'pausa', 'altro')
  ),
  constraint wse_planning_status_check check (
    planning_status in ('scheduled', 'confirmed', 'rescheduled', 'cancelled', 'completed')
  ),
  constraint wse_priority_check check (priority is null or priority in ('alta', 'media', 'bassa')),
  constraint wse_block_shape check (
    event_type <> 'blocco_agenda'
    or (
      work_order_id is null
      and block_type is not null
      and planning_status = 'confirmed'
    )
  )
);

create table if not exists public.workshop_schedule_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.workshop_schedule_events (id) on delete cascade,
  revision integer not null,
  action text not null,
  changed_by uuid not null references public.profiles (id) on delete restrict,
  changed_at timestamptz not null default now(),
  before jsonb,
  after jsonb,
  constraint wsh_action_check check (
    action in (
      'created', 'moved', 'deleted', 'linked', 'unlinked',
      'duration_changed', 'time_changed', 'status_changed', 'cancelled'
    )
  )
);

create index if not exists idx_wse_start_end_active
  on public.workshop_schedule_events (start_at, end_at)
  where deleted_at is null;

create index if not exists idx_wse_work_order_active
  on public.workshop_schedule_events (work_order_id)
  where deleted_at is null;

create index if not exists idx_wse_created_by on public.workshop_schedule_events (created_by);

create index if not exists idx_wse_planning_status_active
  on public.workshop_schedule_events (planning_status)
  where deleted_at is null;

create unique index if not exists idx_wse_legacy_promemoria
  on public.workshop_schedule_events (legacy_promemoria_id)
  where legacy_promemoria_id is not null;

create index if not exists idx_wsh_event_id on public.workshop_schedule_history (event_id, changed_at desc);

comment on table public.workshop_schedule_events is
  'Sessioni pianificate Agenda Officina — bounded context Planning (1 WorkOrder → N sessioni).';

drop trigger if exists trg_workshop_schedule_events_updated_at on public.workshop_schedule_events;
create trigger trg_workshop_schedule_events_updated_at
before update on public.workshop_schedule_events
for each row execute function public.set_updated_at();

-- Internal: write history row
create or replace function public.wse_write_history(
  p_event_id uuid,
  p_revision integer,
  p_action text,
  p_before jsonb,
  p_after jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workshop_schedule_history (event_id, revision, action, changed_by, before, after)
  values (p_event_id, p_revision, p_action, public.rbac_auth_uid(), p_before, p_after);
end;
$$;

-- Internal: detect overlaps
create or replace function public.cab_detect_schedule_conflicts(
  p_start timestamptz,
  p_end timestamptz,
  p_work_order_id uuid default null,
  p_exclude_id uuid default null
)
returns table (
  event_id uuid,
  conflict_type text,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  work_order_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    case
      when e.event_type = 'blocco_agenda' or coalesce(p_work_order_id::text, '') = '' and e.event_type = 'blocco_agenda' then 'block'
      when p_work_order_id is not null and e.work_order_id = p_work_order_id then 'same_wo'
      else 'cross_wo'
    end as conflict_type,
    e.title,
    e.start_at,
    e.end_at,
    e.work_order_id
  from public.workshop_schedule_events e
  where e.deleted_at is null
    and e.planning_status <> 'cancelled'
    and (p_exclude_id is null or e.id <> p_exclude_id)
    and e.start_at < p_end
    and e.end_at > p_start
    and (
      e.event_type = 'blocco_agenda'
      or (
        p_work_order_id is null
        or e.work_order_id is null
        or e.work_order_id <> p_work_order_id
      )
    );
$$;

create or replace function public.cab_list_workshop_schedule_events(
  p_start timestamptz,
  p_end timestamptz,
  p_filters jsonb default '{}'::jsonb
)
returns setof public.workshop_schedule_events
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_read_operational') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  return query
  select e.*
  from public.workshop_schedule_events e
  where e.deleted_at is null
    and e.start_at < p_end
    and e.end_at > p_start
    and (p_filters ? 'event_types' = false or e.event_type = any (
      select jsonb_array_elements_text(p_filters->'event_types')
    ))
    and (p_filters ? 'planning_statuses' = false or e.planning_status = any (
      select jsonb_array_elements_text(p_filters->'planning_statuses')
    ))
    and (p_filters ? 'priorities' = false or e.priority = any (
      select jsonb_array_elements_text(p_filters->'priorities')
    ))
    and (
      p_filters ? 'with_work_order' = false
      or (p_filters->>'with_work_order' = 'true' and e.work_order_id is not null)
      or (p_filters->>'with_work_order' = 'false' and e.work_order_id is null)
    )
    and (p_filters ? 'created_by' = false or e.created_by = (p_filters->>'created_by')::uuid)
    and (p_filters ? 'work_order_id' = false or e.work_order_id = (p_filters->>'work_order_id')::uuid)
  order by e.start_at asc, e.title asc;
end;
$$;

create or replace function public.cab_list_workshop_schedule_by_work_order(p_work_order_id uuid)
returns setof public.workshop_schedule_events
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_work_order_id is null then
    raise exception 'Lavorazione non valida';
  end if;
  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_read_operational') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  return query
  select e.*
  from public.workshop_schedule_events e
  where e.deleted_at is null
    and e.work_order_id = p_work_order_id
  order by e.start_at asc;
end;
$$;

create or replace function public.cab_upsert_workshop_schedule_event(
  p_id uuid default null,
  p_title text default null,
  p_description text default null,
  p_event_type text default 'intervento_programmato',
  p_block_type text default null,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_planning_status text default 'scheduled',
  p_priority text default null,
  p_work_order_id uuid default null,
  p_series_id uuid default null,
  p_recurrence_frequency text default null,
  p_recurrence_interval integer default 1,
  p_recurrence_until date default null
)
returns public.workshop_schedule_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.workshop_schedule_events%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_action text;
  v_conflict record;
begin
  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  if p_start_at is null or p_end_at is null or p_start_at >= p_end_at then
    raise exception 'Intervallo temporale non valido' using errcode = '22000';
  end if;
  if extract(epoch from (p_end_at - p_start_at)) > 24 * 60 * 60 then
    raise exception 'Durata massima 24 ore' using errcode = '22000';
  end if;

  if p_event_type = 'blocco_agenda' then
    if p_work_order_id is not null then
      raise exception 'Blocco agenda non collegabile a lavorazione' using errcode = '22000';
    end if;
    if p_block_type is null then
      raise exception 'Tipo blocco obbligatorio' using errcode = '22000';
    end if;
    p_planning_status := 'confirmed';
  end if;

  for v_conflict in
    select * from public.cab_detect_schedule_conflicts(p_start_at, p_end_at, p_work_order_id, p_id)
    where conflict_type in ('cross_wo', 'block')
  loop
    raise exception 'ERR_SCHEDULE_OVERLAP: conflitto con sessione %', v_conflict.event_id using errcode = 'P0001';
  end loop;

  if p_id is null then
    insert into public.workshop_schedule_events (
      title, description, event_type, block_type, start_at, end_at,
      planning_status, priority, work_order_id, revision, created_by,
      series_id, recurrence_frequency, recurrence_interval, recurrence_until
    ) values (
      coalesce(nullif(trim(p_title), ''), 'Sessione'),
      p_description,
      coalesce(p_event_type, 'intervento_programmato'),
      p_block_type,
      p_start_at,
      p_end_at,
      coalesce(p_planning_status, 'scheduled'),
      p_priority,
      p_work_order_id,
      1,
      public.rbac_auth_uid(),
      p_series_id,
      p_recurrence_frequency,
      coalesce(p_recurrence_interval, 1),
      p_recurrence_until
    )
    returning * into v_row;

    v_after := to_jsonb(v_row);
    perform public.wse_write_history(v_row.id, v_row.revision, 'created', null, v_after);
    return v_row;
  end if;

  select * into v_row from public.workshop_schedule_events where id = p_id and deleted_at is null;
  if not found then
    raise exception 'Sessione non trovata';
  end if;

  v_before := to_jsonb(v_row);

  update public.workshop_schedule_events
  set
    title = coalesce(nullif(trim(p_title), ''), v_row.title),
    description = coalesce(p_description, description),
    event_type = coalesce(p_event_type, event_type),
    block_type = case when coalesce(p_event_type, event_type) = 'blocco_agenda' then p_block_type else p_block_type end,
    start_at = coalesce(p_start_at, start_at),
    end_at = coalesce(p_end_at, end_at),
    planning_status = coalesce(p_planning_status, planning_status),
    priority = coalesce(p_priority, priority),
    work_order_id = case when coalesce(p_event_type, event_type) = 'blocco_agenda' then null else coalesce(p_work_order_id, work_order_id) end,
    revision = revision + 1,
    series_id = coalesce(p_series_id, series_id),
    recurrence_frequency = coalesce(p_recurrence_frequency, recurrence_frequency),
    recurrence_interval = coalesce(p_recurrence_interval, recurrence_interval),
    recurrence_until = coalesce(p_recurrence_until, recurrence_until)
  where id = p_id
  returning * into v_row;

  v_after := to_jsonb(v_row);
  if v_before->>'work_order_id' is distinct from v_after->>'work_order_id' then
    v_action := case when v_after->>'work_order_id' is null then 'unlinked' else 'linked' end;
  elsif v_before->>'planning_status' = 'cancelled' or v_after->>'planning_status' = 'cancelled' then
    v_action := 'cancelled';
  elsif v_before->>'planning_status' is distinct from v_after->>'planning_status' then
    v_action := 'status_changed';
  elsif v_before->>'start_at' is distinct from v_after->>'start_at' or v_before->>'end_at' is distinct from v_after->>'end_at' then
    v_action := case
      when v_before->>'start_at' = v_after->>'start_at' or v_before->>'end_at' = v_after->>'end_at' then 'duration_changed'
      else 'moved'
    end;
  else
    v_action := 'time_changed';
  end if;

  perform public.wse_write_history(v_row.id, v_row.revision, v_action, v_before, v_after);
  return v_row;
end;
$$;

create or replace function public.cab_patch_workshop_schedule_times(
  p_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns public.workshop_schedule_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.workshop_schedule_events%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_action text;
  v_conflict record;
begin
  if p_id is null then raise exception 'Sessione non valida'; end if;
  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;
  if p_start_at is null or p_end_at is null or p_start_at >= p_end_at then
    raise exception 'Intervallo temporale non valido' using errcode = '22000';
  end if;
  if extract(epoch from (p_end_at - p_start_at)) > 24 * 60 * 60 then
    raise exception 'Durata massima 24 ore' using errcode = '22000';
  end if;

  select * into v_row from public.workshop_schedule_events where id = p_id and deleted_at is null;
  if not found then raise exception 'Sessione non trovata'; end if;

  for v_conflict in
    select * from public.cab_detect_schedule_conflicts(p_start_at, p_end_at, v_row.work_order_id, p_id)
    where conflict_type in ('cross_wo', 'block')
  loop
    raise exception 'ERR_SCHEDULE_OVERLAP: conflitto con sessione %', v_conflict.event_id using errcode = 'P0001';
  end loop;

  v_before := to_jsonb(v_row);

  update public.workshop_schedule_events
  set
    start_at = p_start_at,
    end_at = p_end_at,
    planning_status = 'rescheduled',
    revision = revision + 1
  where id = p_id
  returning * into v_row;

  v_after := to_jsonb(v_row);
  v_action := case
    when v_before->>'start_at' = v_after->>'start_at' or v_before->>'end_at' = v_after->>'end_at' then 'duration_changed'
    else 'moved'
  end;
  perform public.wse_write_history(v_row.id, v_row.revision, v_action, v_before, v_after);
  return v_row;
end;
$$;

create or replace function public.soft_delete_workshop_schedule_event(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.workshop_schedule_events%rowtype;
  v_before jsonb;
begin
  if p_id is null then raise exception 'Sessione non valida'; end if;
  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select * into v_row from public.workshop_schedule_events where id = p_id and deleted_at is null;
  if not found then raise exception 'Sessione non trovata o già eliminata'; end if;

  v_before := to_jsonb(v_row);

  update public.workshop_schedule_events
  set deleted_at = now(), revision = revision + 1
  where id = p_id;

  perform public.wse_write_history(p_id, v_row.revision + 1, 'deleted', v_before, null);
end;
$$;

create or replace function public.cab_migrate_dashboard_promemoria_to_schedule()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_prom record;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  for v_prom in
    select *
    from public.dashboard_promemoria
    where deleted_at is null
  loop
    if exists (select 1 from public.workshop_schedule_events where legacy_promemoria_id = v_prom.id) then
      continue;
    end if;

    v_start := (v_prom.event_date::text || ' ' || coalesce(v_prom.event_time::text, '09:00:00'))::timestamptz;
    v_end := v_start + interval '1 hour';

    insert into public.workshop_schedule_events (
      title, description, event_type, start_at, end_at, planning_status,
      created_by, series_id, recurrence_frequency, recurrence_interval, recurrence_until,
      legacy_promemoria_id, revision
    ) values (
      v_prom.title,
      v_prom.description,
      'promemoria',
      v_start,
      v_end,
      'scheduled',
      v_prom.created_by,
      v_prom.series_id,
      v_prom.recurrence_frequency,
      coalesce(v_prom.recurrence_interval, 1),
      v_prom.recurrence_until,
      v_prom.id,
      1
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- RLS
alter table public.workshop_schedule_events enable row level security;
alter table public.workshop_schedule_history enable row level security;

drop policy if exists cap_wse_select on public.workshop_schedule_events;
create policy cap_wse_select on public.workshop_schedule_events for select to authenticated
using (
  deleted_at is null
  and public.rbac_has_capability(public.rbac_auth_uid(), 'can_read_operational')
);

drop policy if exists cap_wse_insert on public.workshop_schedule_events;
create policy cap_wse_insert on public.workshop_schedule_events for insert to authenticated
with check (
  public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
  and created_by = public.rbac_auth_uid()
);

drop policy if exists cap_wse_update on public.workshop_schedule_events;
create policy cap_wse_update on public.workshop_schedule_events for update to authenticated
using (
  public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational')
  and deleted_at is null
)
with check (public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational'));

drop policy if exists cap_wsh_select on public.workshop_schedule_history;
create policy cap_wsh_select on public.workshop_schedule_history for select to authenticated
using (public.rbac_has_capability(public.rbac_auth_uid(), 'can_read_operational'));

revoke all on table public.workshop_schedule_events from public, anon;
revoke all on table public.workshop_schedule_history from public, anon;
grant select, insert, update on table public.workshop_schedule_events to authenticated;
grant select on table public.workshop_schedule_history to authenticated;

revoke all on function public.wse_write_history(uuid, integer, text, jsonb, jsonb) from public;
revoke all on function public.cab_detect_schedule_conflicts(timestamptz, timestamptz, uuid, uuid) from public;
revoke all on function public.cab_list_workshop_schedule_events(timestamptz, timestamptz, jsonb) from public;
revoke all on function public.cab_list_workshop_schedule_by_work_order(uuid) from public;
revoke all on function public.cab_upsert_workshop_schedule_event(
  uuid, text, text, text, text, timestamptz, timestamptz, text, text, uuid, uuid, text, integer, date
) from public;
revoke all on function public.cab_patch_workshop_schedule_times(uuid, timestamptz, timestamptz) from public;
revoke all on function public.soft_delete_workshop_schedule_event(uuid) from public;
revoke all on function public.cab_migrate_dashboard_promemoria_to_schedule() from public;

grant execute on function public.cab_detect_schedule_conflicts(timestamptz, timestamptz, uuid, uuid) to authenticated;
grant execute on function public.cab_list_workshop_schedule_events(timestamptz, timestamptz, jsonb) to authenticated;
grant execute on function public.cab_list_workshop_schedule_by_work_order(uuid) to authenticated;
grant execute on function public.cab_upsert_workshop_schedule_event(
  uuid, text, text, text, text, timestamptz, timestamptz, text, text, uuid, uuid, text, integer, date
) to authenticated;
grant execute on function public.cab_patch_workshop_schedule_times(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.soft_delete_workshop_schedule_event(uuid) to authenticated;
grant execute on function public.cab_migrate_dashboard_promemoria_to_schedule() to authenticated;

-- Notification registry
insert into public.notification_type_registry (
  type, allowed_scope_type, allowed_scope_value, allowed_scope_module, default_priority, caller_min_role
) values
  ('workshop_schedule_created', 'role', 'admin', null, 'medium', 'staff'),
  ('workshop_schedule_updated', 'role', 'admin', null, 'low', 'staff'),
  ('workshop_schedule_deleted', 'role', 'admin', null, 'low', 'staff'),
  ('workshop_schedule_conflict', 'role', 'admin', null, 'high', 'staff'),
  ('workshop_schedule_overdue', 'role', 'admin', null, 'high', 'staff'),
  ('workshop_schedule_not_started', 'role', 'admin', null, 'medium', 'staff'),
  ('workshop_schedule_reminder_due', 'role', 'admin', null, 'medium', 'staff'),
  ('workshop_schedule_day_saturated', 'role', 'admin', null, 'low', 'staff'),
  ('workshop_schedule_day_empty', 'role', 'admin', null, 'low', 'staff')
on conflict (type) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.workshop_schedule_events;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

commit;
