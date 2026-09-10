-- FASE 5 — fornitori_anagrafiche SSOT.
begin;

create table if not exists public.fornitori_anagrafiche (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  nome_display text not null,
  ragione_sociale text,
  partita_iva text,
  partita_iva_normalized text,
  codice_fiscale text,
  codice_fiscale_normalized text,
  nazione text not null default 'IT',
  indirizzo text,
  pec text,
  codice_destinatario text,
  telefono text,
  email text,
  fiscal_regime_id uuid references public.fiscal_regimes (id) on delete set null,
  default_vat_code_id uuid references public.vat_codes (id) on delete set null,
  default_payment_term_id uuid references public.payment_terms (id) on delete set null,
  default_payment_method_id uuid references public.payment_methods (id) on delete set null,
  default_account_id uuid references public.accounting_accounts (id) on delete set null,
  default_accounting_journal_id uuid references public.accounting_journals (id) on delete set null,
  default_document_series_id uuid references public.document_series (id) on delete set null,
  is_active boolean not null default true,
  archived_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fornitori_anagrafiche_nome_display_chk check (char_length(trim(nome_display)) > 0),
  constraint fornitori_anagrafiche_tipo_soggetto_chk check (true)
);

create index if not exists idx_fornitori_anagrafiche_company_id
  on public.fornitori_anagrafiche (company_id);

create index if not exists idx_fornitori_anagrafiche_nome_display_norm
  on public.fornitori_anagrafiche (lower(trim(nome_display)));

create unique index if not exists idx_fornitori_anagrafiche_piva_uq
  on public.fornitori_anagrafiche (company_id, partita_iva_normalized)
  where partita_iva_normalized is not null and nazione = 'IT';

create unique index if not exists idx_fornitori_anagrafiche_cf_uq
  on public.fornitori_anagrafiche (company_id, codice_fiscale_normalized)
  where codice_fiscale_normalized is not null and nazione = 'IT';

create or replace function public.fornitori_anagrafiche_normalize_fiscal()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.partita_iva := public.admin_normalize_partita_iva(new.partita_iva, new.nazione);
  new.codice_fiscale := public.admin_normalize_codice_fiscale(new.codice_fiscale, new.nazione);
  new.pec := public.admin_normalize_pec(new.pec);
  new.codice_destinatario := public.admin_normalize_codice_destinatario(new.codice_destinatario);
  new.partita_iva_normalized := new.partita_iva;
  new.codice_fiscale_normalized := new.codice_fiscale;
  new.nazione := upper(coalesce(trim(new.nazione), 'IT'));
  return new;
end;
$$;

drop trigger if exists trg_fornitori_anagrafiche_normalize on public.fornitori_anagrafiche;
create trigger trg_fornitori_anagrafiche_normalize
before insert or update on public.fornitori_anagrafiche
for each row execute function public.fornitori_anagrafiche_normalize_fiscal();

create or replace function public.admin_assert_fornitore_config_same_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_ref_company uuid;
begin
  if new.default_account_id is not null then
    select company_id into v_ref_company from public.accounting_accounts where id = new.default_account_id;
    if v_ref_company is distinct from new.company_id then
      raise exception 'default_account_id must belong to same company';
    end if;
  end if;
  if new.default_accounting_journal_id is not null then
    select company_id into v_ref_company from public.accounting_journals where id = new.default_accounting_journal_id;
    if v_ref_company is distinct from new.company_id then
      raise exception 'default_accounting_journal_id must belong to same company';
    end if;
  end if;
  if new.default_payment_term_id is not null then
    select company_id into v_ref_company from public.payment_terms where id = new.default_payment_term_id;
    if v_ref_company is distinct from new.company_id then
      raise exception 'default_payment_term_id must belong to same company';
    end if;
  end if;
  if new.default_payment_method_id is not null then
    select company_id into v_ref_company from public.payment_methods where id = new.default_payment_method_id;
    if v_ref_company is distinct from new.company_id then
      raise exception 'default_payment_method_id must belong to same company';
    end if;
  end if;
  if new.default_vat_code_id is not null then
    select company_id into v_ref_company from public.vat_codes where id = new.default_vat_code_id;
    if v_ref_company is distinct from new.company_id then
      raise exception 'default_vat_code_id must belong to same company';
    end if;
  end if;
  if new.fiscal_regime_id is not null then
    select company_id into v_ref_company from public.fiscal_regimes where id = new.fiscal_regime_id;
    if v_ref_company is distinct from new.company_id then
      raise exception 'fiscal_regime_id must belong to same company';
    end if;
  end if;
  if new.default_document_series_id is not null then
    select company_id into v_ref_company from public.document_series where id = new.default_document_series_id;
    if v_ref_company is distinct from new.company_id then
      raise exception 'default_document_series_id must belong to same company';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fornitori_anagrafiche_company_guard on public.fornitori_anagrafiche;
create trigger trg_fornitori_anagrafiche_company_guard
before insert or update on public.fornitori_anagrafiche
for each row execute function public.admin_assert_fornitore_config_same_company();

drop trigger if exists trg_fornitori_anagrafiche_updated_at on public.fornitori_anagrafiche;
create trigger trg_fornitori_anagrafiche_updated_at
before update on public.fornitori_anagrafiche
for each row execute function public.set_updated_at();

-- fornitore bank accounts
create table if not exists public.fornitore_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  fornitore_id uuid not null references public.fornitori_anagrafiche (id) on delete cascade,
  iban_normalized text not null,
  bank_name text,
  bic text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fornitore_bank_accounts_iban_chk check (
    char_length(trim(iban_normalized)) >= 15 and char_length(trim(iban_normalized)) <= 34
  )
);

create index if not exists idx_fornitore_bank_accounts_fornitore_id
  on public.fornitore_bank_accounts (fornitore_id);

create unique index if not exists idx_fornitore_bank_accounts_one_default
  on public.fornitore_bank_accounts (fornitore_id)
  where is_default = true and is_active = true;

create or replace function public.fornitore_bank_accounts_normalize_iban()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.iban_normalized := public.admin_normalize_iban(new.iban_normalized);
  if new.iban_normalized is null then
    raise exception 'IBAN required';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fornitore_bank_accounts_normalize on public.fornitore_bank_accounts;
create trigger trg_fornitore_bank_accounts_normalize
before insert or update on public.fornitore_bank_accounts
for each row execute function public.fornitore_bank_accounts_normalize_iban();

drop trigger if exists trg_fornitore_bank_accounts_updated_at on public.fornitore_bank_accounts;
create trigger trg_fornitore_bank_accounts_updated_at
before update on public.fornitore_bank_accounts
for each row execute function public.set_updated_at();

alter table public.fornitori_anagrafiche enable row level security;
alter table public.fornitore_bank_accounts enable row level security;

comment on table public.fornitori_anagrafiche is 'FASE 5 — SSOT anagrafica fornitore.';
comment on table public.fornitore_bank_accounts is 'FASE 5 — Conti bancari fornitore.';

commit;
