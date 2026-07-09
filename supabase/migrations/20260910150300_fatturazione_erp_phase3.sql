-- ERP Fatturazione Hub — Fase 3: contabilità + impostazioni billing.
begin;

create table if not exists public.billing_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  description text not null,
  source_type text,
  source_id uuid,
  invoice_id uuid references public.invoices (id) on delete set null,
  status text not null default 'posted',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint accounting_entries_status_chk check (status in ('draft', 'posted', 'reversed'))
);

create table if not exists public.accounting_entry_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.accounting_entries (id) on delete cascade,
  account_code text not null,
  description text,
  debit numeric(14, 2) not null default 0,
  credit numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint accounting_entry_lines_amount_chk check (debit >= 0 and credit >= 0)
);

create index if not exists idx_accounting_entries_invoice on public.accounting_entries (invoice_id);
create index if not exists idx_accounting_entry_lines_entry on public.accounting_entry_lines (entry_id);

alter table public.billing_settings enable row level security;
alter table public.accounting_entries enable row level security;
alter table public.accounting_entry_lines enable row level security;

drop policy if exists cap_billing_settings on public.billing_settings;
create policy cap_billing_settings on public.billing_settings for all to authenticated
using (public.rbac_module_can('fatturazione', 'read'))
with check (public.rbac_module_can('fatturazione', 'admin'));

drop policy if exists cap_accounting_entries on public.accounting_entries;
create policy cap_accounting_entries on public.accounting_entries for all to authenticated
using (public.rbac_module_can('fatturazione', 'read'))
with check (public.rbac_module_can('fatturazione', 'write'));

drop policy if exists cap_accounting_entry_lines on public.accounting_entry_lines;
create policy cap_accounting_entry_lines on public.accounting_entry_lines for all to authenticated
using (public.rbac_module_can('fatturazione', 'read'))
with check (public.rbac_module_can('fatturazione', 'write'));

insert into public.billing_settings (key, value)
values ('workflow_permissions_by_role', '{}'::jsonb)
on conflict (key) do nothing;

commit;
