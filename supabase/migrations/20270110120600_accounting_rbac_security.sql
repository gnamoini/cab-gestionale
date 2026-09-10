-- FASE 3 — Accounting RBAC module, RLS, revokes.
begin;

-- Permissions
insert into public.permissions (key, module, action, label, description, is_system)
values
  ('contabilita.read', 'contabilita', 'read', 'Contabilità — lettura', null, true),
  ('contabilita.write', 'contabilita', 'write', 'Contabilità — scrittura', null, true),
  ('contabilita.post', 'contabilita', 'post', 'Contabilità — registrazione', null, true),
  ('contabilita.reverse', 'contabilita', 'reverse', 'Contabilità — storno', null, true),
  ('contabilita.cancel', 'contabilita', 'cancel', 'Contabilità — annullamento bozza', null, true),
  ('contabilita.admin', 'contabilita', 'admin', 'Contabilità — amministrazione', null, true)
on conflict (key) do nothing;

-- Grant to admin and addetto_amministrativo
insert into public.role_permissions (role_id, permission_id, effect)
select r.id, p.id, 'allow'
from public.roles r
cross join public.permissions p
where r.key in ('admin', 'addetto_amministrativo')
  and p.key like 'contabilita.%'
on conflict (role_id, permission_id) do nothing;

-- Valid ERP module
create or replace function public.rbac_is_valid_erp_module(p_module text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_module, '') in (
    'magazzino', 'magazzino_carichi', 'preventivi', 'lavorazioni', 'mezzi', 'report',
    'documenti', 'dipendenti', 'fatturazione', 'ddt', 'ordini_fornitori', 'document_capture',
    'contabilita'
  );
$$;

insert into public.rbac_page_module_expansion (page_key, module)
values ('fatturazione', 'contabilita')
on conflict do nothing;

-- RLS helper
create or replace function public.accounting_rls_company_match()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rbac_user_company_id() is not null
    and public.accounting_rbac_can('read');
$$;

-- Enable RLS on all accounting tables
alter table public.accounting_account_groups enable row level security;
alter table public.accounting_accounts enable row level security;
alter table public.fiscal_periods enable row level security;
alter table public.accounting_periods enable row level security;
alter table public.accounting_journals enable row level security;
alter table public.accounting_causes enable row level security;
alter table public.accounting_journal_sequences enable row level security;
alter table public.vat_codes enable row level security;
alter table public.vat_registries enable row level security;
alter table public.vat_periods enable row level security;
alter table public.vat_movements enable row level security;
alter table public.payment_terms enable row level security;
alter table public.payment_methods enable row level security;
alter table public.receivables enable row level security;
alter table public.payables enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.fixed_assets enable row level security;
alter table public.fixed_asset_movements enable row level security;
alter table public.depreciation_schedules enable row level security;

-- Macro for company-scoped SELECT
do $$
declare
  t text;
  tables text[] := array[
    'accounting_account_groups', 'accounting_accounts', 'fiscal_periods', 'accounting_periods',
    'accounting_journals', 'accounting_causes', 'accounting_journal_sequences',
    'vat_codes', 'vat_registries', 'vat_periods', 'vat_movements',
    'payment_terms', 'payment_methods', 'receivables', 'payables',
    'bank_accounts', 'bank_transactions', 'fixed_assets', 'fixed_asset_movements',
    'depreciation_schedules'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists cap_%s_select on public.%I', t, t);
    execute format(
      'create policy cap_%s_select on public.%I for select to authenticated using (
        company_id = public.rbac_user_company_id()
        and public.rbac_user_company_id() is not null
        and public.accounting_rbac_can(''read'')
      )', t, t
    );
  end loop;
end;
$$;

-- accounting_entries / lines: SELECT only for authenticated (writes via RPC)
drop policy if exists cap_accounting_entries on public.accounting_entries;
drop policy if exists cap_accounting_entry_lines on public.accounting_entry_lines;

create policy cap_accounting_entries_select on public.accounting_entries
  for select to authenticated
  using (
    company_id = public.rbac_user_company_id()
    and public.rbac_user_company_id() is not null
    and public.accounting_rbac_can('read')
  );

create policy cap_accounting_entry_lines_select on public.accounting_entry_lines
  for select to authenticated
  using (
    exists (
      select 1 from public.accounting_entries e
      where e.id = entry_id
        and e.company_id = public.rbac_user_company_id()
        and public.accounting_rbac_can('read')
    )
  );

-- REVOKE direct mutations from authenticated (RPC-only via SECURITY DEFINER)
revoke insert, update, delete on public.accounting_entries from authenticated;
revoke insert, update, delete on public.accounting_entry_lines from authenticated;
revoke insert, update, delete on public.receivables from authenticated;
revoke insert, update, delete on public.payables from authenticated;
revoke insert, update, delete on public.vat_movements from authenticated;
revoke insert, update, delete on public.bank_transactions from authenticated;
revoke insert, update, delete on public.fixed_asset_movements from authenticated;

-- Config tables: admin write via contabilita.admin (service_role bypasses RLS)
do $$
declare
  t text;
  tables text[] := array[
    'accounting_account_groups', 'accounting_accounts', 'fiscal_periods', 'accounting_periods',
    'accounting_journals', 'accounting_causes', 'vat_codes', 'vat_registries', 'vat_periods',
    'payment_terms', 'payment_methods', 'bank_accounts', 'fixed_assets', 'depreciation_schedules'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists cap_%s_write on public.%I', t, t);
    execute format(
      'create policy cap_%s_write on public.%I for all to authenticated using (
        company_id = public.rbac_user_company_id()
        and public.accounting_rbac_can(''admin'')
      ) with check (
        company_id = public.rbac_user_company_id()
        and public.accounting_rbac_can(''admin'')
      )', t, t
    );
  end loop;
end;
$$;

-- Journal sequences: no direct client access
revoke all on public.accounting_journal_sequences from authenticated;
grant select on public.accounting_journal_sequences to authenticated;

drop policy if exists cap_accounting_journal_sequences_select on public.accounting_journal_sequences;
create policy cap_accounting_journal_sequences_select on public.accounting_journal_sequences
  for select to authenticated
  using (company_id = public.rbac_user_company_id() and public.accounting_rbac_can('read'));

commit;

notify pgrst, 'reload schema';
