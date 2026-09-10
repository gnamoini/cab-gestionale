-- FASE 4 — RBAC permissions, remove admin bypass, RLS for new tables, REVOKE period writes.
begin;

-- New permissions
insert into public.permissions (key, module, action, label, description, is_system)
values
  ('contabilita.fiscal_year_open', 'contabilita', 'fiscal_year_open', 'Contabilità — apertura esercizio', 'Apre un nuovo esercizio contabile con 12 periodi mensili', true),
  ('contabilita.fiscal_year_close', 'contabilita', 'fiscal_year_close', 'Contabilità — chiusura esercizio', 'Chiude un esercizio quando tutti i periodi sono chiusi', true),
  ('contabilita.period_close', 'contabilita', 'period_close', 'Contabilità — chiusura periodo', 'Chiude un periodo contabile mensile', true),
  ('contabilita.period_lock', 'contabilita', 'period_lock', 'Contabilità — blocco periodo', 'Blocca definitivamente un periodo chiuso', true),
  ('contabilita.period_reopen', 'contabilita', 'period_reopen', 'Contabilità — riapertura periodo', 'Riapre un periodo chiuso (non LOCKED)', true),
  ('contabilita.adjust', 'contabilita', 'adjust', 'Contabilità — rettifica', 'Crea scrittura correttiva', true)
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id, effect)
select r.id, p.id, 'allow'
from public.roles r
cross join public.permissions p
where r.key in ('admin', 'addetto_amministrativo')
  and p.key in (
    'contabilita.fiscal_year_open',
    'contabilita.fiscal_year_close',
    'contabilita.period_close',
    'contabilita.period_lock',
    'contabilita.period_reopen',
    'contabilita.adjust'
  )
on conflict (role_id, permission_id) do nothing;

-- Remove admin blanket bypass — admin uses explicit seeded permissions
create or replace function public.accounting_rbac_can(p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.rbac_auth_uid();
  v_role text;
  v_perm text;
begin
  if v_uid is null then
    return false;
  end if;

  v_role := lower(trim(public.rbac_role_for_user(v_uid)));
  v_perm := 'contabilita.' || lower(trim(p_action));

  if public.rbac_role_has_permission(v_role, v_perm) then
    return true;
  end if;

  -- Transition: fatturazione write grants contabilita read/write/post/reverse/cancel only
  if p_action in ('read', 'write', 'post', 'reverse', 'cancel') then
    return public.rbac_module_can('fatturazione', case when p_action = 'read' then 'read' else 'write' end);
  end if;

  return false;
end;
$$;

-- Enable RLS on new tables
alter table public.accounting_fiscal_years enable row level security;
alter table public.accounting_audit_events enable row level security;

-- SELECT on fiscal years (read via contabilita)
drop policy if exists cap_accounting_fiscal_years_select on public.accounting_fiscal_years;
create policy cap_accounting_fiscal_years_select on public.accounting_fiscal_years
  for select to authenticated
  using (
    company_id = public.rbac_user_company_id()
    and public.rbac_user_company_id() is not null
    and public.accounting_rbac_can('read')
  );

-- SELECT on periods (read via contabilita)
drop policy if exists cap_accounting_periods_select on public.accounting_periods;
create policy cap_accounting_periods_select on public.accounting_periods
  for select to authenticated
  using (
    company_id = public.rbac_user_company_id()
    and public.rbac_user_company_id() is not null
    and public.accounting_rbac_can('read')
  );

-- Audit events: read only
drop policy if exists cap_accounting_audit_events_select on public.accounting_audit_events;
create policy cap_accounting_audit_events_select on public.accounting_audit_events
  for select to authenticated
  using (
    company_id = public.rbac_user_company_id()
    and public.accounting_rbac_can('read')
  );

-- REVOKE direct writes on fiscal years and periods (RPC-only via period_ssot)
revoke insert, update, delete on public.accounting_fiscal_years from authenticated;
revoke insert, update, delete on public.accounting_periods from authenticated;
revoke insert, update, delete on public.accounting_audit_events from authenticated;

-- Drop legacy write policies on renamed/recreated period tables
drop policy if exists cap_fiscal_periods_select on public.accounting_fiscal_years;
drop policy if exists cap_fiscal_periods_write on public.accounting_fiscal_years;
drop policy if exists cap_accounting_periods_write on public.accounting_periods;

-- accounting_insert_audit_event: internal only (no client execute)
revoke all on function public.accounting_insert_audit_event(uuid, text, uuid, text, text, text, text, jsonb, uuid) from public, anon, authenticated;

-- Refresh grant on reverse_entry (signature changed in FASE 4)
revoke all on function public.accounting_reverse_entry(uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.accounting_reverse_entry(uuid, date, text, text) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
