-- FASE 4 — Fiscal years, monthly periods, audit events, entry FK reshape.
begin;

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Helpers: period SSOT flag (state transitions only via RPC)
-- ---------------------------------------------------------------------------
create or replace function public.accounting_period_ssot_enabled()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('accounting.period_ssot', true), '') = 'true';
$$;

create or replace function public.accounting_audit_ssot_enabled()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('accounting.audit_ssot', true), '') = 'true';
$$;

-- ---------------------------------------------------------------------------
-- 1. Dependency-safe rename fiscal_periods → accounting_fiscal_years
-- ---------------------------------------------------------------------------
alter table public.accounting_entries
  drop constraint if exists accounting_entries_fiscal_period_id_fkey;

alter table public.vat_periods
  drop constraint if exists vat_periods_fiscal_period_id_fkey;

alter table public.fiscal_periods rename to accounting_fiscal_years;

alter table public.accounting_entries
  rename column fiscal_period_id to fiscal_year_id;

alter table public.accounting_entries
  add constraint accounting_entries_fiscal_year_id_fkey
  foreign key (fiscal_year_id) references public.accounting_fiscal_years (id) on delete restrict;

alter table public.vat_periods
  rename column fiscal_period_id to fiscal_year_id;

alter table public.vat_periods
  add constraint vat_periods_fiscal_year_id_fkey
  foreign key (fiscal_year_id) references public.accounting_fiscal_years (id) on delete restrict;

-- Evolve fiscal year columns
alter table public.accounting_fiscal_years
  add column if not exists opened_at timestamptz,
  add column if not exists opened_by uuid references public.profiles (id) on delete set null,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references public.profiles (id) on delete set null;

alter table public.accounting_fiscal_years
  drop constraint if exists fiscal_periods_status_chk;

update public.accounting_fiscal_years
set status = upper(status)
where status in ('open', 'closed', 'locked');

update public.accounting_fiscal_years
set status = 'CLOSED'
where status = 'LOCKED';

alter table public.accounting_fiscal_years
  add constraint accounting_fiscal_years_status_chk
  check (status in ('OPEN', 'CLOSED'));

alter table public.accounting_fiscal_years
  drop constraint if exists fiscal_periods_dates_chk;

alter table public.accounting_fiscal_years
  add constraint accounting_fiscal_years_dates_chk check (start_date <= end_date);

alter table public.accounting_fiscal_years
  rename constraint fiscal_periods_company_year_uniq to accounting_fiscal_years_company_year_uniq;

-- Max one OPEN fiscal year per company
create unique index if not exists idx_accounting_fiscal_years_one_open
  on public.accounting_fiscal_years (company_id)
  where status = 'OPEN';

-- No overlapping fiscal years per company (inclusive bounds)
alter table public.accounting_fiscal_years
  drop constraint if exists accounting_fiscal_years_no_overlap;

alter table public.accounting_fiscal_years
  add constraint accounting_fiscal_years_no_overlap
  exclude using gist (
    company_id with =,
    daterange(start_date, end_date, '[]') with &&
  );

-- ---------------------------------------------------------------------------
-- 2. Reshape accounting_periods → monthly (1..12 per fiscal year)
-- ---------------------------------------------------------------------------
alter table public.accounting_entries
  drop constraint if exists accounting_entries_accounting_period_id_fkey;

alter table public.accounting_periods rename to accounting_periods_annual_legacy;

alter table public.accounting_entries
  rename column accounting_period_id to period_id;

create table public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_id uuid not null references public.accounting_fiscal_years (id) on delete restrict,
  company_id uuid not null references public.companies (id) on delete restrict,
  period_number integer not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'OPEN',
  opened_at timestamptz,
  opened_by uuid references public.profiles (id) on delete set null,
  closed_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
  locked_at timestamptz,
  locked_by uuid references public.profiles (id) on delete set null,
  lock_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_periods_status_chk check (status in ('OPEN', 'CLOSED', 'LOCKED')),
  constraint accounting_periods_number_chk check (period_number between 1 and 12),
  constraint accounting_periods_dates_chk check (start_date <= end_date),
  constraint accounting_periods_fy_number_uniq unique (fiscal_year_id, period_number),
  constraint accounting_periods_company_fy_number_uniq unique (company_id, fiscal_year_id, period_number),
  constraint accounting_periods_no_overlap exclude using gist (
    fiscal_year_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
);

create index if not exists idx_accounting_periods_company_status
  on public.accounting_periods (company_id, status);
create index if not exists idx_accounting_periods_fiscal_year
  on public.accounting_periods (fiscal_year_id, period_number);
create index if not exists idx_accounting_periods_company_dates
  on public.accounting_periods (company_id, start_date, end_date);

alter table public.accounting_periods enable row level security;

-- Trigger: period must be within fiscal year bounds
create or replace function public.accounting_guard_period_within_fiscal_year()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_fy record;
begin
  select * into v_fy from public.accounting_fiscal_years
  where id = new.fiscal_year_id;

  if not found then
    raise exception 'Fiscal year % not found', new.fiscal_year_id;
  end if;

  if new.company_id is distinct from v_fy.company_id then
    raise exception 'Period company_id does not match fiscal year';
  end if;

  if new.start_date < v_fy.start_date or new.end_date > v_fy.end_date then
    raise exception 'Period dates must be within fiscal year bounds';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_accounting_periods_within_fy on public.accounting_periods;
create trigger trg_accounting_periods_within_fy
  before insert or update on public.accounting_periods
  for each row execute function public.accounting_guard_period_within_fiscal_year();

-- Block direct status changes on fiscal years and periods
create or replace function public.accounting_guard_period_status_direct()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not public.accounting_period_ssot_enabled() then
      raise exception 'Direct status change not allowed on %; use accounting period RPC', tg_table_name
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_accounting_fiscal_years_status on public.accounting_fiscal_years;
create trigger trg_accounting_fiscal_years_status
  before update on public.accounting_fiscal_years
  for each row execute function public.accounting_guard_period_status_direct();

drop trigger if exists trg_accounting_periods_status on public.accounting_periods;
create trigger trg_accounting_periods_status
  before update on public.accounting_periods
  for each row execute function public.accounting_guard_period_status_direct();

drop trigger if exists trg_accounting_periods_updated_at on public.accounting_periods;
create trigger trg_accounting_periods_updated_at
  before update on public.accounting_periods
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Generate 12 monthly periods for each existing fiscal year
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_month integer;
  v_start date;
  v_end date;
  v_names text[] := array[
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
begin
  for r in select * from public.accounting_fiscal_years
  loop
    for v_month in 1..12 loop
      v_start := make_date(r.year, v_month, 1);
      v_end := (v_start + interval '1 month' - interval '1 day')::date;
      if v_start < r.start_date then continue; end if;
      if v_end > r.end_date then v_end := r.end_date; end if;
      if v_start > r.end_date then continue; end if;

      insert into public.accounting_periods (
        fiscal_year_id, company_id, period_number, name,
        start_date, end_date, status, opened_at
      ) values (
        r.id, r.company_id, v_month,
        v_names[v_month] || ' ' || r.year::text,
        greatest(v_start, r.start_date), least(v_end, r.end_date),
        'OPEN', coalesce(r.opened_at, r.created_at)
      )
      on conflict (fiscal_year_id, period_number) do nothing;
    end loop;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Entry evolution: corrects_entry_id, entry_kind
-- ---------------------------------------------------------------------------
alter table public.accounting_entries
  add column if not exists corrects_entry_id uuid references public.accounting_entries (id) on delete restrict,
  add column if not exists entry_kind text not null default 'normal';

alter table public.accounting_entries
  drop constraint if exists accounting_entries_entry_kind_chk;

alter table public.accounting_entries
  add constraint accounting_entries_entry_kind_chk
  check (entry_kind in ('normal', 'reversal', 'adjustment'));

create index if not exists idx_accounting_entries_reverses
  on public.accounting_entries (reverses_entry_id)
  where reverses_entry_id is not null;

create index if not exists idx_accounting_entries_corrects
  on public.accounting_entries (corrects_entry_id)
  where corrects_entry_id is not null;

create index if not exists idx_accounting_entries_period
  on public.accounting_entries (period_id);

create index if not exists idx_accounting_entries_fiscal_year
  on public.accounting_entries (fiscal_year_id);

-- ---------------------------------------------------------------------------
-- 5. accounting_audit_events (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.accounting_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  actor_user_id uuid references public.profiles (id) on delete set null,
  occurred_at timestamptz not null default now(),
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  previous_state text,
  new_state text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id uuid
);

create index if not exists idx_accounting_audit_events_company_time
  on public.accounting_audit_events (company_id, occurred_at desc);

create index if not exists idx_accounting_audit_events_entity
  on public.accounting_audit_events (entity_type, entity_id);

create or replace function public.accounting_guard_audit_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    raise exception 'Accounting audit events are immutable'
      using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and not public.accounting_audit_ssot_enabled() then
    raise exception 'Direct insert not allowed on accounting_audit_events'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_accounting_audit_immutable on public.accounting_audit_events;
create trigger trg_accounting_audit_immutable
  before insert or update or delete on public.accounting_audit_events
  for each row execute function public.accounting_guard_audit_immutable();

alter table public.accounting_audit_events enable row level security;

-- ---------------------------------------------------------------------------
-- 6. Backfill entry fiscal_year_id + period_id from competence_date
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_fy_id uuid;
  v_period_id uuid;
  v_competence date;
  v_orphans integer := 0;
begin
  for r in
    select e.id, e.company_id, coalesce(e.competence_date, e.entry_date) as comp
    from public.accounting_entries e
  loop
    v_competence := r.comp;
    if v_competence is null then
      v_orphans := v_orphans + 1;
      continue;
    end if;

    select fy.id into v_fy_id
    from public.accounting_fiscal_years fy
    where fy.company_id = r.company_id
      and v_competence between fy.start_date and fy.end_date;

    if v_fy_id is null then
      v_orphans := v_orphans + 1;
      continue;
    end if;

    select ap.id into v_period_id
    from public.accounting_periods ap
    where ap.fiscal_year_id = v_fy_id
      and v_competence between ap.start_date and ap.end_date;

    if v_period_id is null then
      v_orphans := v_orphans + 1;
      continue;
    end if;

    update public.accounting_entries
    set fiscal_year_id = v_fy_id,
        period_id = v_period_id
    where id = r.id;
  end loop;

  if v_orphans > 0 then
    raise exception 'FASE4 backfill blocked: % entries without resolvable fiscal year/period', v_orphans;
  end if;
end;
$$;

alter table public.accounting_entries
  alter column fiscal_year_id set not null,
  alter column period_id set not null;

alter table public.accounting_entries
  add constraint accounting_entries_period_id_fkey
  foreign key (period_id) references public.accounting_periods (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 7. Updated closed-period guard (always uses FK, no null bypass)
-- ---------------------------------------------------------------------------
create or replace function public.accounting_guard_closed_period()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_fy_status text;
  v_period_status text;
  v_entry_kind text;
begin
  v_entry_kind := coalesce(new.entry_kind, 'normal');

  if new.fiscal_year_id is not null then
    select fy.status into v_fy_status
    from public.accounting_fiscal_years fy
    where fy.id = new.fiscal_year_id and fy.company_id = new.company_id;
    if v_fy_status = 'CLOSED' and v_entry_kind = 'normal' and tg_op = 'INSERT' then
      raise exception 'Fiscal year is CLOSED';
    end if;
  end if;

  if new.period_id is not null then
    select ap.status into v_period_status
    from public.accounting_periods ap
    where ap.id = new.period_id and ap.company_id = new.company_id;
    if v_period_status in ('CLOSED', 'LOCKED') and v_entry_kind = 'normal' then
      if tg_op in ('INSERT', 'UPDATE') and (tg_op <> 'UPDATE' or new.status = 'draft') then
        raise exception 'Accounting period is %', v_period_status;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Extended posted immutability
-- ---------------------------------------------------------------------------
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
    if new.company_id is distinct from old.company_id
       or new.fiscal_year_id is distinct from old.fiscal_year_id
       or new.period_id is distinct from old.period_id
       or new.journal_id is distinct from old.journal_id
       or new.cause_id is distinct from old.cause_id
       or new.entry_number is distinct from old.entry_number
       or new.fiscal_year is distinct from old.fiscal_year
       or new.entry_date is distinct from old.entry_date
       or new.competence_date is distinct from old.competence_date
       or new.registration_date is distinct from old.registration_date
       or new.description is distinct from old.description
       or new.source_type is distinct from old.source_type
       or new.source_id is distinct from old.source_id
       or new.invoice_id is distinct from old.invoice_id
       or new.entry_origin is distinct from old.entry_origin
       or new.entry_kind is distinct from old.entry_kind
       or new.reverses_entry_id is distinct from old.reverses_entry_id
       or new.corrects_entry_id is distinct from old.corrects_entry_id
       or new.idempotency_key is distinct from old.idempotency_key
    then
      raise exception 'Cannot modify immutable fields on entry %', old.id;
    end if;
  end if;
  return new;
end;
$$;

-- Drop legacy annual periods table
drop table if exists public.accounting_periods_annual_legacy;

commit;

notify pgrst, 'reload schema';
