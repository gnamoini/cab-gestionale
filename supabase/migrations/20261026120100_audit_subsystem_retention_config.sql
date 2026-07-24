-- Audit retention tiered: configurabile via app_settings + prune per (entita, entita_id).

insert into public.app_settings (module, key, value, updated_at)
values (
  'audit',
  'retention',
  jsonb_build_object(
    'entity_retention_default', 500,
    'entity_retention_overrides', jsonb_build_object(
      'documenti', 100,
      'mezzi', 500,
      'invoices', 1000
    ),
    'dashboard_days', 90,
    'dashboard_max_rows', 10000
  ),
  now()
)
on conflict (module, key) do nothing;

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
      'entity_retention_default', 500,
      'entity_retention_overrides', '{}'::jsonb,
      'dashboard_days', 90,
      'dashboard_max_rows', 10000
    )
  );
$$;

comment on function public.get_audit_retention_config() is
  'SSOT retention audit: entity default/overrides + dashboard window.';

create or replace function public.audit_entity_retention_limit(p_entita text)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cfg jsonb;
  override_val int;
  default_val int;
begin
  cfg := public.get_audit_retention_config();
  default_val := coalesce((cfg->>'entity_retention_default')::int, 500);
  if p_entita is null or btrim(p_entita) = '' then
    return default_val;
  end if;
  override_val := (cfg->'entity_retention_overrides'->>p_entita)::int;
  if override_val is not null and override_val > 0 then
    return override_val;
  end if;
  return default_val;
end;
$$;

create or replace function public.prune_log_modifiche_per_entity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_keep int;
begin
  max_keep := public.audit_entity_retention_limit(new.entita);
  delete from public.log_modifiche prune_row
  where prune_row.entita = new.entita
    and prune_row.entita_id = new.entita_id
    and prune_row.id in (
      select lm.id
      from public.log_modifiche lm
      where lm.entita = new.entita
        and lm.entita_id = new.entita_id
      order by lm.created_at desc
      offset max_keep
    );
  return new;
end;
$$;

drop trigger if exists trg_log_modifiche_retention on public.log_modifiche;

create trigger trg_log_modifiche_retention
after insert on public.log_modifiche
for each row
execute function public.prune_log_modifiche_per_entity();

create or replace function public.prune_log_modifiche_dashboard_window()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg jsonb;
  days_keep int;
  max_rows int;
  cutoff timestamptz;
begin
  cfg := public.get_audit_retention_config();
  days_keep := coalesce((cfg->>'dashboard_days')::int, 90);
  max_rows := coalesce((cfg->>'dashboard_max_rows')::int, 10000);
  cutoff := now() - make_interval(days => days_keep);

  delete from public.log_modifiche lm
  where lm.created_at < cutoff
    and lm.id not in (
      select sub.id
      from (
        select id
        from public.log_modifiche
        order by created_at desc
        limit max_rows
      ) sub
    );
end;
$$;

comment on function public.prune_log_modifiche_per_entity() is
  'Dopo INSERT mantiene max N righe per (entita, entita_id); N da app_settings audit.retention.';
comment on function public.prune_log_modifiche_dashboard_window() is
  'Cron: purge globale oltre dashboard_days mantenendo dashboard_max_rows più recenti.';

revoke all on function public.get_audit_retention_config() from public;
revoke all on function public.audit_entity_retention_limit(text) from public;
revoke all on function public.prune_log_modifiche_dashboard_window() from public;
grant execute on function public.get_audit_retention_config() to authenticated;
grant execute on function public.audit_entity_retention_limit(text) to authenticated;
