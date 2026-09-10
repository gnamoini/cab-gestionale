-- FASE 3 — Accounting engine core: config tables, evolved entries/lines, balance + guards.
begin;

-- ---------------------------------------------------------------------------
-- Config: account groups + accounts
-- ---------------------------------------------------------------------------
create table if not exists public.accounting_account_groups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null,
  parent_id uuid references public.accounting_account_groups (id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint accounting_account_groups_code_chk check (char_length(trim(code)) > 0),
  constraint accounting_account_groups_company_code_uniq unique (company_id, code)
);

create index if not exists idx_accounting_account_groups_company
  on public.accounting_account_groups (company_id, active);

create table if not exists public.accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null,
  account_type text not null default 'general',
  nature text,
  group_id uuid references public.accounting_account_groups (id) on delete restrict,
  parent_id uuid references public.accounting_accounts (id) on delete restrict,
  level integer not null default 1,
  active boolean not null default true,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint accounting_accounts_code_chk check (char_length(trim(code)) > 0),
  constraint accounting_accounts_level_chk check (level >= 1),
  constraint accounting_accounts_company_code_uniq unique (company_id, code)
);

create index if not exists idx_accounting_accounts_company_code
  on public.accounting_accounts (company_id, code);
create index if not exists idx_accounting_accounts_company_parent
  on public.accounting_accounts (company_id, parent_id);
create index if not exists idx_accounting_accounts_company_active
  on public.accounting_accounts (company_id, active);

-- ---------------------------------------------------------------------------
-- Periods
-- ---------------------------------------------------------------------------
create table if not exists public.fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  year integer not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fiscal_periods_status_chk check (status in ('open', 'closed', 'locked')),
  constraint fiscal_periods_company_year_uniq unique (company_id, year),
  constraint fiscal_periods_dates_chk check (start_date <= end_date)
);

create table if not exists public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  year integer not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_periods_status_chk check (status in ('open', 'closed', 'locked')),
  constraint accounting_periods_company_year_uniq unique (company_id, year),
  constraint accounting_periods_dates_chk check (start_date <= end_date)
);

-- ---------------------------------------------------------------------------
-- Journals, causes, sequences
-- ---------------------------------------------------------------------------
create table if not exists public.accounting_journals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null,
  journal_type text not null default 'general',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_journals_code_chk check (char_length(trim(code)) > 0),
  constraint accounting_journals_company_code_uniq unique (company_id, code)
);

create table if not exists public.accounting_causes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null,
  cause_type text not null default 'general',
  default_journal_id uuid references public.accounting_journals (id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_causes_code_chk check (char_length(trim(code)) > 0),
  constraint accounting_causes_company_code_uniq unique (company_id, code)
);

create table if not exists public.accounting_journal_sequences (
  company_id uuid not null references public.companies (id) on delete restrict,
  journal_id uuid not null references public.accounting_journals (id) on delete restrict,
  fiscal_year integer not null,
  last_number integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (journal_id, fiscal_year)
);

-- ---------------------------------------------------------------------------
-- Evolve accounting_entries
-- ---------------------------------------------------------------------------
alter table public.accounting_entries
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

update public.accounting_entries
set company_id = '00000000-0000-4000-8000-000000000001'::uuid
where company_id is null;

alter table public.accounting_entries
  alter column company_id set not null;

alter table public.accounting_entries
  add column if not exists journal_id uuid references public.accounting_journals (id) on delete restrict,
  add column if not exists cause_id uuid references public.accounting_causes (id) on delete restrict,
  add column if not exists fiscal_period_id uuid references public.fiscal_periods (id) on delete restrict,
  add column if not exists accounting_period_id uuid references public.accounting_periods (id) on delete restrict,
  add column if not exists entry_number integer,
  add column if not exists fiscal_year integer,
  add column if not exists competence_date date,
  add column if not exists registration_date date,
  add column if not exists reversed_by_entry_id uuid references public.accounting_entries (id) on delete restrict,
  add column if not exists reverses_entry_id uuid references public.accounting_entries (id) on delete restrict,
  add column if not exists idempotency_key text,
  add column if not exists updated_by uuid references public.profiles (id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.accounting_entries
set competence_date = coalesce(competence_date, entry_date),
    registration_date = coalesce(registration_date, entry_date)
where competence_date is null or registration_date is null;

alter table public.accounting_entries drop constraint if exists accounting_entries_status_chk;
alter table public.accounting_entries add constraint accounting_entries_status_chk
  check (status in ('draft', 'posted', 'cancelled', 'reversed'));

alter table public.accounting_entries alter column status set default 'draft';

create unique index if not exists idx_accounting_entries_number_uniq
  on public.accounting_entries (company_id, journal_id, fiscal_year, entry_number)
  where entry_number is not null;

create unique index if not exists idx_accounting_entries_idempotency_uniq
  on public.accounting_entries (company_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_accounting_entries_company_status
  on public.accounting_entries (company_id, status);
create index if not exists idx_accounting_entries_company_journal
  on public.accounting_entries (company_id, journal_id, fiscal_year);

-- ---------------------------------------------------------------------------
-- Evolve accounting_entry_lines
-- ---------------------------------------------------------------------------
alter table public.accounting_entry_lines
  add column if not exists account_id uuid references public.accounting_accounts (id) on delete restrict,
  add column if not exists line_number integer,
  add column if not exists account_code_snapshot text;

alter table public.accounting_entry_lines drop constraint if exists accounting_entry_lines_amount_chk;
alter table public.accounting_entry_lines add constraint accounting_entry_lines_amount_chk
  check (debit >= 0 and credit >= 0);
alter table public.accounting_entry_lines add constraint accounting_entry_lines_xor_chk
  check (not (debit > 0 and credit > 0));
alter table public.accounting_entry_lines add constraint accounting_entry_lines_nonzero_chk
  check (not (debit = 0 and credit = 0));

-- Replace CASCADE with RESTRICT (drop/recreate FK)
alter table public.accounting_entry_lines drop constraint if exists accounting_entry_lines_entry_id_fkey;
alter table public.accounting_entry_lines
  add constraint accounting_entry_lines_entry_id_fkey
  foreign key (entry_id) references public.accounting_entries (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- Balance pending accumulator (transaction-scoped via backend_xid)
-- ---------------------------------------------------------------------------
-- ponytail: PG17 — pg_current_xact_id() returns xid8 (transaction scope)
create unlogged table if not exists public.accounting_entry_balance_pending (
  entry_id uuid not null,
  backend_xid xid8 not null default pg_current_xact_id(),
  primary key (entry_id, backend_xid)
);

-- ---------------------------------------------------------------------------
-- Guard helpers
-- ---------------------------------------------------------------------------
create or replace function public.accounting_write_ssot_enabled()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('accounting.write_ssot', true), '') = 'true';
$$;

create or replace function public.accounting_guard_write_ssot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.accounting_write_ssot_enabled() then
    raise exception 'Direct write not allowed on %; use accounting RPC', tg_table_name
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.accounting_entry_is_mutable(p_entry_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.accounting_entries e
    where e.id = p_entry_id and e.status = 'draft'
  );
$$;

create or replace function public.accounting_guard_line_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_entry_id uuid := coalesce(new.entry_id, old.entry_id);
begin
  if tg_op in ('UPDATE', 'DELETE') and not public.accounting_entry_is_mutable(v_entry_id) then
    raise exception 'Cannot modify lines of non-draft entry %', v_entry_id
      using errcode = '23506';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.accounting_mark_balance_pending()
returns trigger
language plpgsql
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

create or replace function public.accounting_guard_closed_period()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_competence date;
  v_fp_status text;
  v_ap_status text;
begin
  v_competence := coalesce(new.competence_date, new.entry_date, current_date);

  if new.fiscal_period_id is not null then
    select fp.status into v_fp_status
    from public.fiscal_periods fp
    where fp.id = new.fiscal_period_id and fp.company_id = new.company_id;
    if v_fp_status in ('closed', 'locked') then
      raise exception 'Fiscal period is %', v_fp_status;
    end if;
  end if;

  if new.accounting_period_id is not null then
    select ap.status into v_ap_status
    from public.accounting_periods ap
    where ap.id = new.accounting_period_id and ap.company_id = new.company_id;
    if v_ap_status in ('closed', 'locked') then
      raise exception 'Accounting period is %', v_ap_status;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.accounting_guard_posted_entry_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status in ('posted', 'reversed', 'cancelled') then
    if new.status is distinct from old.status
       and new.reversed_by_entry_id is distinct from old.reversed_by_entry_id
       and new.status = 'reversed'
       and public.accounting_write_ssot_enabled()
    then
      return new;
    end if;
    if new.description is distinct from old.description
       or new.competence_date is distinct from old.competence_date
       or new.journal_id is distinct from old.journal_id
       or new.entry_number is distinct from old.entry_number
       or new.fiscal_year is distinct from old.fiscal_year
    then
      raise exception 'Cannot modify immutable fields on entry %', old.id;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
drop trigger if exists trg_accounting_entries_write_ssot on public.accounting_entries;
create trigger trg_accounting_entries_write_ssot
  before insert or update or delete on public.accounting_entries
  for each row execute function public.accounting_guard_write_ssot();

drop trigger if exists trg_accounting_entries_closed_period on public.accounting_entries;
create trigger trg_accounting_entries_closed_period
  before insert or update on public.accounting_entries
  for each row execute function public.accounting_guard_closed_period();

drop trigger if exists trg_accounting_entries_posted_immutable on public.accounting_entries;
create trigger trg_accounting_entries_posted_immutable
  before update on public.accounting_entries
  for each row execute function public.accounting_guard_posted_entry_immutable();

drop trigger if exists trg_accounting_entry_lines_write_ssot on public.accounting_entry_lines;
create trigger trg_accounting_entry_lines_write_ssot
  before insert or update or delete on public.accounting_entry_lines
  for each row execute function public.accounting_guard_write_ssot();

drop trigger if exists trg_accounting_entry_lines_immutable on public.accounting_entry_lines;
create trigger trg_accounting_entry_lines_immutable
  before update or delete on public.accounting_entry_lines
  for each row execute function public.accounting_guard_line_immutable();

drop trigger if exists trg_accounting_entry_lines_mark_pending on public.accounting_entry_lines;
create trigger trg_accounting_entry_lines_mark_pending
  after insert or update or delete on public.accounting_entry_lines
  for each row execute function public.accounting_mark_balance_pending();

drop trigger if exists trg_accounting_entry_lines_balance_commit on public.accounting_entry_lines;
create constraint trigger trg_accounting_entry_lines_balance_commit
  after insert or update or delete on public.accounting_entry_lines
  deferrable initially deferred
  for each row execute function public.accounting_assert_pending_entries_balanced();

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists trg_accounting_accounts_updated_at on public.accounting_accounts;
create trigger trg_accounting_accounts_updated_at
  before update on public.accounting_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_accounting_entries_updated_at on public.accounting_entries;
create trigger trg_accounting_entries_updated_at
  before update on public.accounting_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed minimal config for default company
-- ---------------------------------------------------------------------------
insert into public.fiscal_periods (company_id, year, start_date, end_date, status)
values (
  '00000000-0000-4000-8000-000000000001'::uuid,
  2026,
  '2026-01-01'::date,
  '2026-12-31'::date,
  'open'
)
on conflict (company_id, year) do nothing;

insert into public.accounting_periods (company_id, year, start_date, end_date, status)
values (
  '00000000-0000-4000-8000-000000000001'::uuid,
  2026,
  '2026-01-01'::date,
  '2026-12-31'::date,
  'open'
)
on conflict (company_id, year) do nothing;

insert into public.accounting_journals (company_id, code, description, journal_type, active)
values (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'GEN',
  'Giornale generale',
  'general',
  true
)
on conflict (company_id, code) do nothing;

commit;

notify pgrst, 'reload schema';
