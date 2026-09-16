-- Supabase Security Advisor follow-up (2026-09): lint 0010, 0013, 0011, 0024, 0028.
-- Idempotent: CREATE OR REPLACE, REVOKE, ENABLE ROW LEVEL SECURITY, DO $$ gates.

begin;

-- ---------------------------------------------------------------------------
-- A — view security_invoker (lint 0010)
-- ---------------------------------------------------------------------------

create or replace view public.v_invoice_sdi_submissions_legacy
with (security_invoker = true) as
select * from public.invoice_sdi_submissions;

comment on view public.v_invoice_sdi_submissions_legacy is
  'FASE 9 — read-only compatibility view. Use invoice_transmissions for new writes.';

grant select on public.v_invoice_sdi_submissions_legacy to authenticated;

-- ---------------------------------------------------------------------------
-- B — internal tables: REVOKE clients + RLS (lint 0013)
-- ---------------------------------------------------------------------------

revoke all on table public.accounting_entry_balance_pending from public;
revoke all on table public.accounting_entry_balance_pending from anon;
revoke all on table public.accounting_entry_balance_pending from authenticated;
alter table public.accounting_entry_balance_pending enable row level security;

revoke all on table public.admin_billing_customer_migration_map from public;
revoke all on table public.admin_billing_customer_migration_map from anon;
revoke all on table public.admin_billing_customer_migration_map from authenticated;
alter table public.admin_billing_customer_migration_map enable row level security;

-- Trigger helpers must write pending rows while RLS blocks clients.
create or replace function public.accounting_mark_balance_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid := coalesce(new.entry_id, old.entry_id);
begin
  insert into public.accounting_entry_balance_pending (entry_id, backend_xid)
  values (v_entry_id, pg_current_xact_id())
  on conflict do nothing;
  return coalesce(new, old);
end;
$$;

create or replace function public.accounting_assert_pending_entries_balanced()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_total_debit numeric(14, 2);
  v_total_credit numeric(14, 2);
  v_line_count integer;
  v_status text;
begin
  for r in
    select p.entry_id
    from public.accounting_entry_balance_pending p
    where p.backend_xid = pg_current_xact_id()
  loop
    select e.status into v_status
    from public.accounting_entries e
    where e.id = r.entry_id;

    if v_status is null then
      raise exception 'Balance check: entry % not found', r.entry_id;
    end if;

    select coalesce(sum(l.debit), 0), coalesce(sum(l.credit), 0), count(*)
    into v_total_debit, v_total_credit, v_line_count
    from public.accounting_entry_lines l
    where l.entry_id = r.entry_id;

    if v_line_count > 0 then
      if v_line_count < 2 then
        raise exception 'Entry % requires at least 2 lines (has %)', r.entry_id, v_line_count;
      end if;
      if v_total_debit <> v_total_credit then
        raise exception 'Entry % unbalanced: debit=% credit=%', r.entry_id, v_total_debit, v_total_credit;
      end if;
    end if;
  end loop;

  delete from public.accounting_entry_balance_pending
  where backend_xid = pg_current_xact_id();

  return coalesce(new, old);
end;
$$;

revoke all on function public.accounting_mark_balance_pending() from public, anon, authenticated;
revoke all on function public.accounting_assert_pending_entries_balanced() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- C — search_path on public functions missing it (lint 0011)
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1
        from pg_depend dep
        where dep.classid = 'pg_proc'::regclass
          and dep.objid = p.oid
          and dep.refclassid = 'pg_extension'::regclass
          and dep.deptype = 'e'
      )
      and (
        p.proconfig is null
        or not exists (
          select 1
          from unnest(p.proconfig) cfg
          where cfg like 'search_path=%'
        )
      )
  loop
    begin
      execute format(
        'alter function public.%I(%s) set search_path = public',
        r.proname,
        r.args
      );
    exception
      when insufficient_privilege then
        raise notice 'skip search_path (insufficient_privilege): %.%', r.proname, r.args;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- D — permissive INSERT policies (lint 0024)
-- ---------------------------------------------------------------------------

drop policy if exists cap_audit_coverage_events_insert on public.audit_coverage_events;
create policy cap_audit_coverage_events_insert on public.audit_coverage_events
  for insert to authenticated
  with check (public.rbac_is_operatore_or_admin());

drop policy if exists mezzo_resolution_events_insert on public.mezzo_resolution_events;
create policy mezzo_resolution_events_insert on public.mezzo_resolution_events
  for insert to authenticated
  with check (public.rbac_is_operatore_or_admin());

-- ---------------------------------------------------------------------------
-- E — anon/PUBLIC must not execute SECURITY DEFINER RPC (lint 0028)
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke all on function public.%I(%s) from anon',
      r.proname,
      r.args
    );
    execute format(
      'revoke all on function public.%I(%s) from public',
      r.proname,
      r.args
    );
  end loop;
end $$;

-- Trigger-only SECURITY DEFINER helpers (lint 0029 subset)
revoke all on function public.trg_invoice_assert_source_allocations() from authenticated;
revoke all on function public.trg_lavorazioni_enqueue_preventivi_search_rebuild() from authenticated;
revoke all on function public.trg_mezzi_enqueue_preventivi_search_rebuild() from authenticated;

-- ---------------------------------------------------------------------------
-- F — verification gates
-- ---------------------------------------------------------------------------

do $$
declare
  v_missing_rls text[];
  v_client_grants text[];
  v_missing_invoker text[];
  v_anon_definer text[];
begin
  select coalesce(array_agg(c.relname order by c.relname), array[]::text[])
  into v_missing_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname = any(array[
      'accounting_entry_balance_pending',
      'admin_billing_customer_migration_map'
    ])
    and not c.relrowsecurity;

  if coalesce(array_length(v_missing_rls, 1), 0) > 0 then
    raise exception 'RLS not enabled on: %', array_to_string(v_missing_rls, ', ');
  end if;

  select coalesce(array_agg(t.tablename order by t.tablename), array[]::text[])
  into v_client_grants
  from unnest(array[
    'accounting_entry_balance_pending',
    'admin_billing_customer_migration_map'
  ]) as t(tablename)
  where has_table_privilege('authenticated', format('public.%I', t.tablename), 'SELECT')
     or has_table_privilege('authenticated', format('public.%I', t.tablename), 'INSERT')
     or has_table_privilege('authenticated', format('public.%I', t.tablename), 'UPDATE')
     or has_table_privilege('authenticated', format('public.%I', t.tablename), 'DELETE')
     or has_table_privilege('anon', format('public.%I', t.tablename), 'SELECT')
     or has_table_privilege('anon', format('public.%I', t.tablename), 'INSERT')
     or has_table_privilege('anon', format('public.%I', t.tablename), 'UPDATE')
     or has_table_privilege('anon', format('public.%I', t.tablename), 'DELETE');

  if coalesce(array_length(v_client_grants, 1), 0) > 0 then
    raise exception 'Client roles still have table privileges on: %', array_to_string(v_client_grants, ', ');
  end if;

  select coalesce(array_agg(c.relname order by c.relname), array[]::text[])
  into v_missing_invoker
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'v'
    and c.relname = 'v_invoice_sdi_submissions_legacy'
    and (
      c.reloptions is null
      or not exists (
        select 1
        from unnest(c.reloptions) opt
        where opt = 'security_invoker=true'
      )
    );

  if coalesce(array_length(v_missing_invoker, 1), 0) > 0 then
    raise exception 'v_invoice_sdi_submissions_legacy missing security_invoker=true';
  end if;

  select coalesce(array_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' order by 1), array[]::text[])
  into v_anon_definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and has_function_privilege('anon', p.oid, 'EXECUTE');

  if coalesce(array_length(v_anon_definer, 1), 0) > 0 then
    raise exception 'anon still has EXECUTE on SECURITY DEFINER functions: %',
      array_to_string(v_anon_definer, ', ');
  end if;

  raise notice 'security_advisor_linter_followup OK';
end $$;

commit;

notify pgrst, 'reload schema';
