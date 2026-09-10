-- FASE 3 — Payment foundation + receivables/payables subledgers.
begin;

create table if not exists public.payment_terms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null,
  days integer not null default 0,
  end_of_month boolean not null default false,
  split_schedule jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_terms_code_chk check (char_length(trim(code)) > 0),
  constraint payment_terms_company_code_uniq unique (company_id, code)
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null,
  method_type text not null default 'transfer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_methods_code_chk check (char_length(trim(code)) > 0),
  constraint payment_methods_company_code_uniq unique (company_id, code)
);

create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  entry_id uuid not null references public.accounting_entries (id) on delete restrict,
  entry_line_id uuid not null references public.accounting_entry_lines (id) on delete restrict,
  customer_id uuid references public.billing_customers (id) on delete restrict,
  operational_open_item_id uuid references public.customer_open_items (id) on delete set null,
  payment_term_id uuid references public.payment_terms (id) on delete restrict,
  payment_method_id uuid references public.payment_methods (id) on delete restrict,
  due_date date not null,
  amount numeric(14, 2) not null,
  residual numeric(14, 2) not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receivables_status_chk check (status in ('open', 'partial', 'closed', 'cancelled')),
  constraint receivables_amount_chk check (amount > 0 and residual >= 0 and residual <= amount)
);

create table if not exists public.payables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  entry_id uuid not null references public.accounting_entries (id) on delete restrict,
  entry_line_id uuid not null references public.accounting_entry_lines (id) on delete restrict,
  supplier_ref uuid,
  payment_term_id uuid references public.payment_terms (id) on delete restrict,
  payment_method_id uuid references public.payment_methods (id) on delete restrict,
  due_date date not null,
  amount numeric(14, 2) not null,
  residual numeric(14, 2) not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payables_status_chk check (status in ('open', 'partial', 'closed', 'cancelled')),
  constraint payables_amount_chk check (amount > 0 and residual >= 0 and residual <= amount)
);

create index if not exists idx_receivables_entry_line on public.receivables (entry_line_id);
create index if not exists idx_payables_entry_line on public.payables (entry_line_id);

-- Quota sum cannot exceed entry line amount
create or replace function public.accounting_assert_receivable_quota()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_line_amount numeric(14, 2);
  v_quota_sum numeric(14, 2);
  v_entry_line_id uuid := coalesce(new.entry_line_id, old.entry_line_id);
begin
  select coalesce(l.debit, 0) + coalesce(l.credit, 0) into v_line_amount
  from public.accounting_entry_lines l where l.id = v_entry_line_id;

  select coalesce(sum(r.amount), 0) into v_quota_sum
  from public.receivables r
  where r.entry_line_id = v_entry_line_id
    and r.id is distinct from coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if tg_op in ('INSERT', 'UPDATE') then
    v_quota_sum := v_quota_sum + new.amount;
  end if;

  if v_quota_sum > v_line_amount then
    raise exception 'Receivable quota sum % exceeds line amount %', v_quota_sum, v_line_amount;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.accounting_assert_payable_quota()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_line_amount numeric(14, 2);
  v_quota_sum numeric(14, 2);
  v_entry_line_id uuid := coalesce(new.entry_line_id, old.entry_line_id);
begin
  select coalesce(l.debit, 0) + coalesce(l.credit, 0) into v_line_amount
  from public.accounting_entry_lines l where l.id = v_entry_line_id;

  select coalesce(sum(p.amount), 0) into v_quota_sum
  from public.payables p
  where p.entry_line_id = v_entry_line_id
    and p.id is distinct from coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if tg_op in ('INSERT', 'UPDATE') then
    v_quota_sum := v_quota_sum + new.amount;
  end if;

  if v_quota_sum > v_line_amount then
    raise exception 'Payable quota sum % exceeds line amount %', v_quota_sum, v_line_amount;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_receivables_quota on public.receivables;
create trigger trg_receivables_quota
  before insert or update on public.receivables
  for each row execute function public.accounting_assert_receivable_quota();

drop trigger if exists trg_payables_quota on public.payables;
create trigger trg_payables_quota
  before insert or update on public.payables
  for each row execute function public.accounting_assert_payable_quota();

commit;

notify pgrst, 'reload schema';
