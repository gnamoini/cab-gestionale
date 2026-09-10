-- FASE 7 — VAT Engine schema (identity + configurations + snapshot columns).
begin;

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- vat_operation_types — semantica interna CAB (not XML nature)
-- ---------------------------------------------------------------------------
create table if not exists public.vat_operation_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vat_operation_types_code_chk check (char_length(trim(code)) > 0),
  constraint vat_operation_types_company_code_uniq unique (company_id, code)
);

-- ---------------------------------------------------------------------------
-- vat_natures — normativa / tracciato XML
-- ---------------------------------------------------------------------------
create table if not exists public.vat_natures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  family text not null,
  code text not null,
  description text not null,
  valid_from date not null default '1900-01-01',
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vat_natures_code_chk check (char_length(trim(code)) > 0),
  constraint vat_natures_company_code_uniq unique (company_id, code),
  constraint vat_natures_dates_chk check (valid_to is null or valid_from <= valid_to)
);

-- ---------------------------------------------------------------------------
-- Refactor vat_codes → identity only; migrate legacy columns to configurations
-- ---------------------------------------------------------------------------
create table if not exists public.vat_code_configurations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  vat_code_id uuid not null references public.vat_codes (id) on delete restrict,
  description text not null,
  rate numeric(6, 3) not null default 0,
  nature_id uuid references public.vat_natures (id) on delete restrict,
  operation_type_id uuid not null references public.vat_operation_types (id) on delete restrict,
  vat_account_id uuid references public.accounting_accounts (id) on delete restrict,
  vat_register_id uuid references public.vat_registries (id) on delete restrict,
  direction text not null default 'sales',
  deductibility_rate numeric(5, 2) not null default 100,
  valid_from date not null,
  valid_to date,
  active boolean not null default true,
  normative_reference text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vat_code_configurations_direction_chk check (direction in ('sales', 'purchase', 'both')),
  constraint vat_code_configurations_rate_chk check (rate >= 0),
  constraint vat_code_configurations_deductibility_chk check (
    deductibility_rate >= 0 and deductibility_rate <= 100
  ),
  constraint vat_code_configurations_dates_chk check (valid_to is null or valid_from <= valid_to),
  constraint vat_code_configurations_metadata_obj_chk check (jsonb_typeof(metadata) = 'object')
);

-- Migrate any legacy vat_codes rows (rate/nature on identity) into configurations
do $$
declare
  v_row record;
  v_op_imponibile uuid;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vat_codes' and column_name = 'rate'
  ) then
    for v_row in select * from public.vat_codes loop
      select id into v_op_imponibile
      from public.vat_operation_types
      where company_id = v_row.company_id and code = 'IMPONIBILE'
      limit 1;

      if v_op_imponibile is null then
        insert into public.vat_operation_types (company_id, code, description)
        values (v_row.company_id, 'IMPONIBILE', 'Operazione imponibile')
        on conflict (company_id, code) do nothing
        returning id into v_op_imponibile;

        if v_op_imponibile is null then
          select id into v_op_imponibile
          from public.vat_operation_types
          where company_id = v_row.company_id and code = 'IMPONIBILE';
        end if;
      end if;

      insert into public.vat_code_configurations (
        company_id, vat_code_id, description, rate, operation_type_id,
        direction, deductibility_rate, valid_from, valid_to, active
      )
      values (
        v_row.company_id,
        v_row.id,
        v_row.description,
        coalesce(v_row.rate, 0),
        v_op_imponibile,
        case lower(coalesce(v_row.registry_type, 'sales'))
          when 'purchase' then 'purchase'
          when 'purchases' then 'purchase'
          when 'acquisti' then 'purchase'
          else 'sales'
        end,
        case
          when v_row.deductibility ~ '^[0-9]+(\.[0-9]+)?$' then v_row.deductibility::numeric
          else 100
        end,
        coalesce(v_row.valid_from, '1900-01-01'::date),
        v_row.valid_to,
        v_row.active
      )
      on conflict do nothing;
    end loop;

    alter table public.vat_codes drop column if exists description;
    alter table public.vat_codes drop column if exists rate;
    alter table public.vat_codes drop column if exists nature;
    alter table public.vat_codes drop column if exists deductibility;
    alter table public.vat_codes drop column if exists registry_type;
    alter table public.vat_codes drop column if exists valid_from;
    alter table public.vat_codes drop column if exists valid_to;
  end if;
exception
  when undefined_table then null;
end;
$$;

-- Ensure description exists on vat_codes for legacy compat — use code as fallback via view if needed
comment on table public.vat_codes is 'FASE 7 — stable VAT code identity; configuration in vat_code_configurations';

-- ---------------------------------------------------------------------------
-- vat_registries evolution
-- ---------------------------------------------------------------------------
alter table public.vat_registries
  add column if not exists direction text not null default 'sales',
  add column if not exists valid_from date not null default '1900-01-01',
  add column if not exists valid_to date;

alter table public.vat_registries
  drop constraint if exists vat_registries_direction_chk;

alter table public.vat_registries
  add constraint vat_registries_direction_chk check (direction in ('sales', 'purchase', 'both'));

-- ---------------------------------------------------------------------------
-- Overlap EXCLUDE per (vat_code_id, direction)
-- ---------------------------------------------------------------------------
alter table public.vat_code_configurations
  drop constraint if exists vat_code_configurations_no_overlap;

alter table public.vat_code_configurations
  add constraint vat_code_configurations_no_overlap
  exclude using gist (
    vat_code_id with =,
    direction with =,
    daterange(valid_from, coalesce(valid_to, 'infinity'::date), '[]') with &&
  )
  where (active = true);

-- ---------------------------------------------------------------------------
-- both-direction conflict guard
-- ---------------------------------------------------------------------------
create or replace function public.vat_assert_configuration_direction_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_conflict record;
begin
  if not coalesce(new.active, true) then
    return new;
  end if;

  if new.direction = 'both' then
    select c.id, c.direction into v_conflict
    from public.vat_code_configurations c
    where c.vat_code_id = new.vat_code_id
      and c.active = true
      and c.id is distinct from new.id
      and c.direction in ('sales', 'purchase', 'both')
      and daterange(c.valid_from, coalesce(c.valid_to, 'infinity'::date), '[]')
          && daterange(new.valid_from, coalesce(new.valid_to, 'infinity'::date), '[]')
    limit 1;
    if found then
      raise exception 'VAT configuration both-direction overlaps existing % configuration', v_conflict.direction;
    end if;
  else
    select c.id, c.direction into v_conflict
    from public.vat_code_configurations c
    where c.vat_code_id = new.vat_code_id
      and c.active = true
      and c.id is distinct from new.id
      and c.direction = 'both'
      and daterange(c.valid_from, coalesce(c.valid_to, 'infinity'::date), '[]')
          && daterange(new.valid_from, coalesce(new.valid_to, 'infinity'::date), '[]')
    limit 1;
    if found then
      raise exception 'VAT configuration % overlaps existing both-direction configuration', new.direction;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_vat_code_configurations_direction_overlap on public.vat_code_configurations;
create trigger trg_vat_code_configurations_direction_overlap
  before insert or update on public.vat_code_configurations
  for each row execute function public.vat_assert_configuration_direction_overlap();

-- ---------------------------------------------------------------------------
-- vat_audit_events
-- ---------------------------------------------------------------------------
create table if not exists public.vat_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint vat_audit_events_entity_chk check (char_length(trim(entity_type)) > 0)
);

create index if not exists idx_vat_code_configurations_lookup
  on public.vat_code_configurations (company_id, vat_code_id, direction, valid_from);

create index if not exists idx_vat_audit_events_entity
  on public.vat_audit_events (company_id, entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- invoice_rows — VAT snapshot columns + NC parent row ref
-- ---------------------------------------------------------------------------
alter table public.invoice_rows
  add column if not exists vat_code_id uuid references public.vat_codes (id) on delete restrict,
  add column if not exists vat_configuration_id uuid references public.vat_code_configurations (id) on delete restrict,
  add column if not exists parent_invoice_row_id uuid references public.invoice_rows (id) on delete set null,
  add column if not exists vat_snapshot_version integer,
  add column if not exists vat_code text,
  add column if not exists vat_description text,
  add column if not exists vat_rate numeric(6, 3),
  add column if not exists vat_nature text,
  add column if not exists vat_operation_type text,
  add column if not exists vat_direction text,
  add column if not exists vat_deductibility_rate numeric(5, 2),
  add column if not exists vat_account_id uuid references public.accounting_accounts (id) on delete restrict,
  add column if not exists vat_register_id uuid references public.vat_registries (id) on delete restrict,
  add column if not exists vat_valid_from date,
  add column if not exists vat_valid_to date,
  add column if not exists vat_normative_reference text,
  add column if not exists vat_snapshot jsonb;

alter table public.invoice_rows
  drop constraint if exists invoice_rows_vat_direction_chk;

alter table public.invoice_rows
  add constraint invoice_rows_vat_direction_chk check (
    vat_direction is null or vat_direction in ('sales', 'purchase', 'both')
  );

alter table public.invoice_rows
  drop constraint if exists invoice_rows_vat_snapshot_obj_chk;

alter table public.invoice_rows
  add constraint invoice_rows_vat_snapshot_obj_chk check (
    vat_snapshot is null or jsonb_typeof(vat_snapshot) = 'object'
  );

-- invoices — fiscal context for EsigibilitaIVA resolution
alter table public.invoices
  add column if not exists fiscal_context jsonb not null default '{}'::jsonb;

alter table public.invoices
  drop constraint if exists invoices_fiscal_context_obj_chk;

alter table public.invoices
  add constraint invoices_fiscal_context_obj_chk check (jsonb_typeof(fiscal_context) = 'object');

-- Guard: VAT snapshot immutable on consolidated invoices
create or replace function public.invoice_guard_vat_snapshot_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from public.invoices where id = coalesce(new.invoice_id, old.invoice_id);
  if v_status is null then
    return new;
  end if;
  if v_status not in ('bozza', 'da_verificare') then
    if tg_op = 'UPDATE' and old.vat_snapshot is not null and (
      new.vat_snapshot is distinct from old.vat_snapshot
      or new.vat_configuration_id is distinct from old.vat_configuration_id
      or new.vat_rate is distinct from old.vat_rate
      or new.vat_nature is distinct from old.vat_nature
      or new.vat_code_id is distinct from old.vat_code_id
    ) then
      raise exception 'VAT snapshot immutable on consolidated invoice';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoice_rows_vat_snapshot_immutable on public.invoice_rows;
create trigger trg_invoice_rows_vat_snapshot_immutable
  before update on public.invoice_rows
  for each row execute function public.invoice_guard_vat_snapshot_immutable();

-- ---------------------------------------------------------------------------
-- RLS on new tables
-- ---------------------------------------------------------------------------
alter table public.vat_operation_types enable row level security;
alter table public.vat_natures enable row level security;
alter table public.vat_code_configurations enable row level security;
alter table public.vat_audit_events enable row level security;

drop policy if exists cap_vat_operation_types_select on public.vat_operation_types;
create policy cap_vat_operation_types_select on public.vat_operation_types
  for select to authenticated
  using (
    company_id = public.rbac_user_company_id()
    and public.accounting_rbac_can('read')
  );

drop policy if exists cap_vat_operation_types_write on public.vat_operation_types;
create policy cap_vat_operation_types_write on public.vat_operation_types
  for all to authenticated
  using (company_id = public.rbac_user_company_id() and public.accounting_rbac_can('admin'))
  with check (company_id = public.rbac_user_company_id() and public.accounting_rbac_can('admin'));

drop policy if exists cap_vat_natures_select on public.vat_natures;
create policy cap_vat_natures_select on public.vat_natures
  for select to authenticated
  using (
    company_id = public.rbac_user_company_id()
    and public.accounting_rbac_can('read')
  );

drop policy if exists cap_vat_natures_write on public.vat_natures;
create policy cap_vat_natures_write on public.vat_natures
  for all to authenticated
  using (company_id = public.rbac_user_company_id() and public.accounting_rbac_can('admin'))
  with check (company_id = public.rbac_user_company_id() and public.accounting_rbac_can('admin'));

drop policy if exists cap_vat_code_configurations_select on public.vat_code_configurations;
create policy cap_vat_code_configurations_select on public.vat_code_configurations
  for select to authenticated
  using (
    company_id = public.rbac_user_company_id()
    and public.accounting_rbac_can('read')
  );

drop policy if exists cap_vat_code_configurations_write on public.vat_code_configurations;
create policy cap_vat_code_configurations_write on public.vat_code_configurations
  for all to authenticated
  using (company_id = public.rbac_user_company_id() and public.accounting_rbac_can('admin'))
  with check (company_id = public.rbac_user_company_id() and public.accounting_rbac_can('admin'));

drop policy if exists cap_vat_audit_events_select on public.vat_audit_events;
create policy cap_vat_audit_events_select on public.vat_audit_events
  for select to authenticated
  using (
    company_id = public.rbac_user_company_id()
    and public.accounting_rbac_can('read')
  );

revoke insert, update, delete on public.vat_code_configurations from authenticated;
revoke insert, update, delete on public.vat_audit_events from authenticated;

commit;

notify pgrst, 'reload schema';
