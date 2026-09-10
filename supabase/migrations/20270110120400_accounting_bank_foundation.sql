-- FASE 3 — Bank foundation.
begin;

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  account_id uuid references public.accounting_accounts (id) on delete restrict,
  name text not null,
  iban text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_accounts_name_chk check (char_length(trim(name)) > 0)
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  bank_account_id uuid not null references public.bank_accounts (id) on delete restrict,
  transaction_date date not null,
  amount numeric(14, 2) not null,
  description text,
  status text not null default 'imported',
  receivable_id uuid references public.receivables (id) on delete set null,
  payable_id uuid references public.payables (id) on delete set null,
  entry_id uuid references public.accounting_entries (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_transactions_status_chk check (status in ('imported', 'matched', 'posted'))
);

create index if not exists idx_bank_transactions_account on public.bank_transactions (company_id, bank_account_id, transaction_date);

commit;

notify pgrst, 'reload schema';
