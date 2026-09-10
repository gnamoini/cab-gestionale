-- FASE 3 — Fixed assets foundation.
begin;

create table if not exists public.fixed_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null,
  asset_account_id uuid references public.accounting_accounts (id) on delete restrict,
  depreciation_account_id uuid references public.accounting_accounts (id) on delete restrict,
  acquisition_date date,
  acquisition_amount numeric(14, 2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fixed_assets_code_chk check (char_length(trim(code)) > 0),
  constraint fixed_assets_company_code_uniq unique (company_id, code)
);

create table if not exists public.fixed_asset_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  fixed_asset_id uuid not null references public.fixed_assets (id) on delete restrict,
  movement_type text not null,
  movement_date date not null default current_date,
  amount numeric(14, 2) not null,
  entry_id uuid references public.accounting_entries (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint fixed_asset_movements_type_chk check (
    movement_type in ('acquisition', 'increment', 'disposal', 'sale', 'adjustment')
  )
);

create table if not exists public.depreciation_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  fixed_asset_id uuid not null references public.fixed_assets (id) on delete restrict,
  start_date date not null,
  end_date date,
  method text not null default 'linear',
  rate numeric(8, 4),
  residual_value numeric(14, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint depreciation_schedules_dates_chk check (end_date is null or start_date <= end_date)
);

create index if not exists idx_fixed_asset_movements_asset on public.fixed_asset_movements (fixed_asset_id);
create index if not exists idx_depreciation_schedules_asset on public.depreciation_schedules (fixed_asset_id);

commit;

notify pgrst, 'reload schema';
