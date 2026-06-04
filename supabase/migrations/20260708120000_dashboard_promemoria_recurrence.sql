-- Promemoria ricorrenti: serie materializzate + soft delete con scope.

begin;

alter table public.dashboard_promemoria
  add column if not exists series_id uuid,
  add column if not exists recurrence_frequency text,
  add column if not exists recurrence_interval int not null default 1,
  add column if not exists recurrence_until date;

alter table public.dashboard_promemoria
  drop constraint if exists dashboard_promemoria_recurrence_frequency_check;

alter table public.dashboard_promemoria
  add constraint dashboard_promemoria_recurrence_frequency_check
  check (
    recurrence_frequency is null
    or recurrence_frequency in ('daily', 'weekly', 'monthly', 'yearly')
  );

alter table public.dashboard_promemoria
  drop constraint if exists dashboard_promemoria_recurrence_interval_positive;

alter table public.dashboard_promemoria
  add constraint dashboard_promemoria_recurrence_interval_positive
  check (recurrence_interval >= 1);

create index if not exists idx_dashboard_promemoria_series_id
  on public.dashboard_promemoria (series_id)
  where deleted_at is null and series_id is not null;

comment on column public.dashboard_promemoria.series_id is
  'UUID condiviso tra occorrenze della stessa serie ricorrente; null = evento singolo.';

comment on column public.dashboard_promemoria.recurrence_frequency is
  'Frequenza serie: daily, weekly, monthly, yearly; null se non ricorrente.';

drop function if exists public.soft_delete_dashboard_promemoria(uuid);

create or replace function public.soft_delete_dashboard_promemoria(
  p_id uuid,
  p_scope text default 'single'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dashboard_promemoria%rowtype;
  v_scope text;
  v_count integer;
begin
  if p_id is null then
    raise exception 'Promemoria non valido';
  end if;

  v_scope := lower(trim(coalesce(p_scope, 'single')));
  if v_scope not in ('single', 'following', 'series') then
    raise exception 'Ambito eliminazione non valido';
  end if;

  if not public.rbac_has_capability(public.rbac_auth_uid(), 'can_write_operational') then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;

  select * into v_row
  from public.dashboard_promemoria
  where id = p_id
    and deleted_at is null;

  if not found then
    raise exception 'Promemoria non trovato o già eliminato';
  end if;

  if v_scope = 'single' or v_row.series_id is null then
    update public.dashboard_promemoria
    set deleted_at = now(),
        updated_at = now()
    where id = p_id
      and deleted_at is null;
    get diagnostics v_count = row_count;
    return v_count;
  end if;

  if v_scope = 'series' then
    update public.dashboard_promemoria
    set deleted_at = now(),
        updated_at = now()
    where series_id = v_row.series_id
      and deleted_at is null;
    get diagnostics v_count = row_count;
    return v_count;
  end if;

  -- following
  update public.dashboard_promemoria
  set deleted_at = now(),
      updated_at = now()
  where series_id = v_row.series_id
    and event_date >= v_row.event_date
    and deleted_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.soft_delete_dashboard_promemoria(uuid, text) is
  'Eliminazione logica promemoria: single (default), following (serie da questa data), series (tutta la serie).';

revoke all on function public.soft_delete_dashboard_promemoria(uuid, text) from public;
grant execute on function public.soft_delete_dashboard_promemoria(uuid, text) to authenticated;

commit;
