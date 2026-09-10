-- FASE 5 — Reference data (gap only) + fiscal normalization SSOT.
begin;

-- ---------------------------------------------------------------------------
-- Normalization SSOT (NULL in → NULL out; empty string → NULL)
-- ---------------------------------------------------------------------------

create or replace function public.admin_normalize_partita_iva(p_value text, p_country text default 'IT')
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text;
  v_country text := upper(coalesce(trim(p_country), 'IT'));
begin
  if p_value is null or trim(p_value) = '' then
    return null;
  end if;
  v := upper(regexp_replace(trim(p_value), '[^0-9A-Za-z]', '', 'g'));
  if v_country = 'IT' then
    v := regexp_replace(v, '^IT', '');
    if v ~ '^\d{11}$' then
      return v;
    end if;
    return upper(trim(p_value));
  end if;
  return v;
end;
$$;

create or replace function public.admin_normalize_codice_fiscale(p_value text, p_country text default 'IT')
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text;
  v_country text := upper(coalesce(trim(p_country), 'IT'));
begin
  if p_value is null or trim(p_value) = '' then
    return null;
  end if;
  v := upper(regexp_replace(trim(p_value), '[^0-9A-Za-z]', '', 'g'));
  if v_country = 'IT' and length(v) = 16 then
    return v;
  end if;
  return v;
end;
$$;

create or replace function public.admin_normalize_iban(p_value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text;
begin
  if p_value is null or trim(p_value) = '' then
    return null;
  end if;
  v := upper(regexp_replace(trim(p_value), '\s+', '', 'g'));
  if length(v) < 15 or length(v) > 34 then
    return v;
  end if;
  return v;
end;
$$;

create or replace function public.admin_normalize_pec(p_value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_value is null or trim(p_value) = '' then
    return null;
  end if;
  return lower(trim(p_value));
end;
$$;

create or replace function public.admin_normalize_codice_destinatario(p_value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text;
begin
  if p_value is null or trim(p_value) = '' then
    return null;
  end if;
  v := upper(regexp_replace(trim(p_value), '\s+', '', 'g'));
  if v = '0000000' or (length(v) = 7 and v ~ '^[A-Z0-9]{7}$') then
    return v;
  end if;
  return upper(trim(p_value));
end;
$$;

-- ---------------------------------------------------------------------------
-- fiscal_regimes (gap — no equivalent in FASE 3)
-- ---------------------------------------------------------------------------

create table if not exists public.fiscal_regimes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null,
  country_code text not null default 'IT',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fiscal_regimes_code_chk check (char_length(trim(code)) > 0),
  constraint fiscal_regimes_unique unique (company_id, code)
);

create index if not exists idx_fiscal_regimes_company_active
  on public.fiscal_regimes (company_id, active);

drop trigger if exists trg_fiscal_regimes_updated_at on public.fiscal_regimes;
create trigger trg_fiscal_regimes_updated_at
before update on public.fiscal_regimes
for each row execute function public.set_updated_at();

insert into public.fiscal_regimes (company_id, code, description, country_code)
select c.id, v.code, v.description, 'IT'
from public.companies c
cross join (
  values
    ('RF01', 'Ordinario'),
    ('RF02', 'Contribuenti minimi'),
    ('RF19', 'Forfettario'),
    ('RF18', 'Altro / da definire')
) as v(code, description)
on conflict (company_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- document_series (sezionale fatture — distinct from accounting_journals)
-- ---------------------------------------------------------------------------

create table if not exists public.document_series (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  code text not null,
  description text not null default '',
  document_type text not null default 'fattura',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_series_code_chk check (char_length(trim(code)) > 0),
  constraint document_series_document_type_chk check (
    document_type in ('fattura', 'nota_credito', 'proforma', 'ddt')
  ),
  constraint document_series_unique unique (company_id, document_type, code)
);

create index if not exists idx_document_series_company_active
  on public.document_series (company_id, active);

drop trigger if exists trg_document_series_updated_at on public.document_series;
create trigger trg_document_series_updated_at
before update on public.document_series
for each row execute function public.set_updated_at();

insert into public.document_series (company_id, code, description, document_type)
select c.id, 'default', 'Serie predefinita', 'fattura'
from public.companies c
on conflict (company_id, document_type, code) do nothing;

-- ---------------------------------------------------------------------------
-- admin_master_data_conflicts
-- ---------------------------------------------------------------------------

create table if not exists public.admin_master_data_conflicts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  entity_type text not null,
  field_name text not null,
  field_value text,
  record_ids uuid[] not null default '{}',
  status text not null default 'detected',
  resolution_notes text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_master_data_conflicts_entity_type_chk check (
    entity_type in ('cliente', 'fornitore', 'billing_migration')
  ),
  constraint admin_master_data_conflicts_status_chk check (
    status in ('detected', 'review_required', 'resolved', 'ignored')
  )
);

create index if not exists idx_admin_master_data_conflicts_status
  on public.admin_master_data_conflicts (company_id, status);

drop trigger if exists trg_admin_master_data_conflicts_updated_at on public.admin_master_data_conflicts;
create trigger trg_admin_master_data_conflicts_updated_at
before update on public.admin_master_data_conflicts
for each row execute function public.set_updated_at();

-- Mapping table for billing migration (explicit historical mapping)
create table if not exists public.admin_billing_customer_migration_map (
  billing_customer_id uuid primary key,
  cliente_anagrafica_id uuid not null,
  mapping_source text not null,
  mapped_at timestamptz not null default now(),
  constraint admin_billing_migration_source_chk check (
    mapping_source in ('existing_fk', 'explicit_map', 'fiscal_unique', 'manual', 'new_record')
  )
);

comment on table public.fiscal_regimes is 'FASE 5 — Regimi fiscali governati (non text libero).';
comment on table public.document_series is 'FASE 5 — Sezionale documentale fatture (≠ accounting_journals).';

commit;
