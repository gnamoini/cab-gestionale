-- ENTITY_HISTORY: max 100 eventi per (entita, entita_id) + ACTIVITY_FEED RPC + snapshot autore ISO.

-- ---------------------------------------------------------------------------
-- Colonna snapshot autore (audit ISO — sopravvive a eliminazione profilo)
-- ---------------------------------------------------------------------------

alter table public.log_modifiche
  add column if not exists autore_nome_snapshot text;

comment on column public.log_modifiche.autore_nome_snapshot is
  'Nome autore al momento INSERT (ISO audit); sopravvive a eliminazione profilo.';

-- Backfill snapshot da profili esistenti (best-effort)
update public.log_modifiche lm
set autore_nome_snapshot = nullif(
  trim(
    coalesce(p.nome, '') ||
    case when coalesce(p.cognome, '') <> '' then ' ' || p.cognome else '' end
  ),
  ''
)
from public.profiles p
where lm.autore_id = p.id
  and lm.autore_nome_snapshot is null
  and lm.autore_id is not null;

-- ---------------------------------------------------------------------------
-- Retention config SSOT (audit_history_retention + dashboard window)
-- ---------------------------------------------------------------------------

insert into public.app_settings (module, key, value, updated_at)
values (
  'audit',
  'retention',
  jsonb_build_object(
    'audit_history_retention', jsonb_build_object(
      'default', 100,
      'scope', 'ENTITY_HISTORY'
    ),
    'dashboard_days', 90,
    'dashboard_max_rows', 10000
  ),
  now()
)
on conflict (module, key) do update
set value = excluded.value,
    updated_at = excluded.updated_at;

create or replace function public.get_audit_retention_config()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select value
      from public.app_settings
      where module = 'audit' and key = 'retention'
      limit 1
    ),
    jsonb_build_object(
      'audit_history_retention', jsonb_build_object('default', 100, 'scope', 'ENTITY_HISTORY'),
      'dashboard_days', 90,
      'dashboard_max_rows', 10000
    )
  );
$$;

comment on function public.get_audit_retention_config() is
  'SSOT retention: audit_history_retention (ENTITY_HISTORY) + ACTIVITY_FEED dashboard window.';

create or replace function public.audit_entity_retention_limit(p_entita text)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cfg jsonb;
  history_cfg jsonb;
  override_val int;
  default_val int;
begin
  cfg := public.get_audit_retention_config();
  history_cfg := cfg->'audit_history_retention';
  default_val := coalesce(
    (history_cfg->>'default')::int,
    (cfg->>'entity_retention_default')::int,
    100
  );
  if p_entita is null or btrim(p_entita) = '' then
    return default_val;
  end if;
  -- legacy overrides (transizione)
  override_val := coalesce(
    (history_cfg->'overrides'->>p_entita)::int,
    (cfg->'entity_retention_overrides'->>p_entita)::int
  );
  if override_val is not null and override_val > 0 then
    return override_val;
  end if;
  return default_val;
end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill ENTITY_HISTORY: max 100 per (entita, coalesce entita_id)
-- ---------------------------------------------------------------------------

delete from public.log_modifiche lm
where lm.id in (
  select t.id
  from (
    select
      id,
      row_number() over (
        partition by entita, coalesce(entita_id::text, '__GLOBAL__')
        order by created_at desc
      ) as rn
    from public.log_modifiche
  ) t
  where t.rn > 100
);

-- ---------------------------------------------------------------------------
-- Indici retention + ACTIVITY_FEED
-- ---------------------------------------------------------------------------

create index if not exists idx_log_modifiche_entity_history
  on public.log_modifiche (entita, entita_id, created_at desc);

create index if not exists idx_log_modifiche_created_at
  on public.log_modifiche (created_at desc);

-- ---------------------------------------------------------------------------
-- Trigger ENTITY_HISTORY (CTE ranked + hashtextextended lock)
-- ---------------------------------------------------------------------------

create or replace function public.prune_log_modifiche_per_entity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_keep int;
  v_entity_key text;
begin
  max_keep := public.audit_entity_retention_limit(new.entita);
  v_entity_key := coalesce(new.entita_id::text, '__GLOBAL__');

  perform pg_advisory_xact_lock(
    hashtextextended('log_modifiche:' || new.entita || ':' || v_entity_key, 0)
  );

  with ranked as (
    select id,
           row_number() over (
             partition by entita, coalesce(entita_id::text, '__GLOBAL__')
             order by created_at desc
           ) as rn
    from public.log_modifiche
    where entita = new.entita
      and coalesce(entita_id::text, '__GLOBAL__') = v_entity_key
  )
  delete from public.log_modifiche lm
  where lm.id in (select id from ranked where rn > max_keep);

  return new;
end;
$$;

comment on function public.prune_log_modifiche_per_entity() is
  'ENTITY_HISTORY retention. Keeps max N events per business object. '
  'Partition key: (entita, entita_id) with NULL → __GLOBAL__. Not a module activity feed.';

drop trigger if exists trg_log_modifiche_retention on public.log_modifiche;

create trigger trg_log_modifiche_retention
after insert on public.log_modifiche
for each row
execute function public.prune_log_modifiche_per_entity();

-- ---------------------------------------------------------------------------
-- ACTIVITY_FEED — query globale dashboard (RBAC per riga)
-- ---------------------------------------------------------------------------

create or replace function public.get_activity_feed(
  p_limit integer default 50,
  p_days integer default 90
)
returns setof public.log_modifiche
language sql
stable
security definer
set search_path = public
as $$
  select lm.*
  from public.log_modifiche lm
  where lm.created_at >= now() - make_interval(days => greatest(1, coalesce(p_days, 90)))
    and public.rbac_can_read_log_row(lm.entita, lm.entita_id)
  order by lm.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

comment on function public.get_activity_feed(integer, integer) is
  'ACTIVITY_FEED: ultimi eventi globali per dashboard; retention DB separata (ENTITY_HISTORY per oggetto).';

revoke all on function public.get_activity_feed(integer, integer) from public;
grant execute on function public.get_activity_feed(integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Tabelle parallele — retention 100 per partition key
-- ---------------------------------------------------------------------------

create or replace function public.prune_mezzo_anagrafica_history_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_keep constant int := 100;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('mezzo_anagrafica_history:' || new.mezzo_id::text, 0)
  );

  with ranked as (
    select id,
           row_number() over (
             partition by mezzo_id
             order by created_at desc
           ) as rn
    from public.mezzo_anagrafica_history
    where mezzo_id = new.mezzo_id
  )
  delete from public.mezzo_anagrafica_history h
  where h.id in (select id from ranked where rn > max_keep);

  return new;
end;
$$;

drop trigger if exists trg_mezzo_anagrafica_history_retention on public.mezzo_anagrafica_history;

create trigger trg_mezzo_anagrafica_history_retention
after insert on public.mezzo_anagrafica_history
for each row
execute function public.prune_mezzo_anagrafica_history_retention();

create or replace function public.prune_maintenance_audit_events_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_keep constant int := 100;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('maintenance_audit:' || new.entity_id::text, 0)
  );

  with ranked as (
    select id,
           row_number() over (
             partition by entity_id
             order by created_at desc
           ) as rn
    from public.maintenance_audit_events
    where entity_id = new.entity_id
  )
  delete from public.maintenance_audit_events e
  where e.id in (select id from ranked where rn > max_keep);

  return new;
end;
$$;

drop trigger if exists trg_maintenance_audit_events_retention on public.maintenance_audit_events;

create trigger trg_maintenance_audit_events_retention
after insert on public.maintenance_audit_events
for each row
execute function public.prune_maintenance_audit_events_retention();

create or replace function public.prune_app_settings_audit_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_keep constant int := 100;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('app_settings_audit:' || new.module, 0)
  );

  with ranked as (
    select id,
           row_number() over (
             partition by module
             order by updated_at desc
           ) as rn
    from public.app_settings_audit
    where module = new.module
  )
  delete from public.app_settings_audit a
  where a.id in (select id from ranked where rn > max_keep);

  return new;
end;
$$;

drop trigger if exists trg_app_settings_audit_retention on public.app_settings_audit;

create trigger trg_app_settings_audit_retention
after insert on public.app_settings_audit
for each row
execute function public.prune_app_settings_audit_retention();

-- Backfill tabelle parallele (max 100 per partition)
delete from public.mezzo_anagrafica_history h
where h.id in (
  select t.id from (
    select id, row_number() over (partition by mezzo_id order by created_at desc) as rn
    from public.mezzo_anagrafica_history
  ) t where t.rn > 100
);

delete from public.maintenance_audit_events e
where e.id in (
  select t.id from (
    select id, row_number() over (partition by entity_id order by created_at desc) as rn
    from public.maintenance_audit_events
  ) t where t.rn > 100
);

delete from public.app_settings_audit a
where a.id in (
  select t.id from (
    select id, row_number() over (partition by module order by updated_at desc) as rn
    from public.app_settings_audit
  ) t where t.rn > 100
);

comment on function public.prune_log_modifiche_dashboard_window() is
  'ACTIVITY_FEED optional cron: purge globale oltre dashboard_days mantenendo dashboard_max_rows più recenti. '
  'Non sostituisce ENTITY_HISTORY per (entita, entita_id).';

-- pg_cron ACTIVITY_FEED window prune (optional if extension present)
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'audit-log-dashboard-window-prune';
    perform cron.schedule(
      'audit-log-dashboard-window-prune',
      '15 2 * * *',
      $cron$select public.prune_log_modifiche_dashboard_window();$cron$
    );
  end if;
exception when others then
  null;
end;
$do$;
