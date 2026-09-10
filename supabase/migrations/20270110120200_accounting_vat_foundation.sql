-- FASE 3 — VAT foundation (parametric, snapshot at posting).
begin;

create table if not exists public.vat_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null,
  rate numeric(6, 3) not null default 0,
  nature text,
  deductibility text,
  registry_type text,
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vat_codes_code_chk check (char_length(trim(code)) > 0),
  constraint vat_codes_company_code_uniq unique (company_id, code)
);

create table if not exists public.vat_registries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null,
  registry_type text not null default 'sales',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vat_registries_code_chk check (char_length(trim(code)) > 0),
  constraint vat_registries_company_code_uniq unique (company_id, code)
);

create table if not exists public.vat_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  fiscal_period_id uuid references public.fiscal_periods (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  status text not null default 'open',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vat_periods_status_chk check (status in ('open', 'closed', 'locked')),
  constraint vat_periods_dates_chk check (period_start <= period_end)
);

create table if not exists public.vat_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  entry_id uuid not null references public.accounting_entries (id) on delete restrict,
  entry_line_id uuid not null references public.accounting_entry_lines (id) on delete restrict,
  vat_code_id uuid references public.vat_codes (id) on delete restrict,
  vat_code_snapshot text not null,
  vat_rate_snapshot numeric(6, 3) not null,
  vat_nature_snapshot text,
  taxable_amount numeric(14, 2) not null default 0,
  tax_amount numeric(14, 2) not null default 0,
  registry_id uuid references public.vat_registries (id) on delete restrict,
  vat_period_id uuid references public.vat_periods (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint vat_movements_amounts_chk check (taxable_amount >= 0 and tax_amount >= 0)
);

create index if not exists idx_vat_movements_entry on public.vat_movements (company_id, entry_id);
create index if not exists idx_vat_movements_line on public.vat_movements (entry_line_id);

commit;

notify pgrst, 'reload schema';
