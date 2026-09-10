-- FASE 5 — Extend clienti_anagrafiche as administrative SSOT.
begin;

-- company_id backfill
alter table public.clienti_anagrafiche
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

update public.clienti_anagrafiche
set company_id = '00000000-0000-4000-8000-000000000001'::uuid
where company_id is null;

alter table public.clienti_anagrafiche
  alter column company_id set not null;

-- Identity & fiscal columns
alter table public.clienti_anagrafiche
  add column if not exists nome_commerciale text,
  add column if not exists tipo_soggetto text,
  add column if not exists codice_fiscale text,
  add column if not exists nazione text not null default 'IT',
  add column if not exists pec text,
  add column if not exists partita_iva_normalized text,
  add column if not exists codice_fiscale_normalized text,
  add column if not exists fiscal_regime_id uuid references public.fiscal_regimes (id) on delete set null,
  add column if not exists default_vat_code_id uuid references public.vat_codes (id) on delete set null,
  add column if not exists split_payment boolean not null default false,
  add column if not exists natura_iva_default text,
  add column if not exists default_payment_term_id uuid references public.payment_terms (id) on delete set null,
  add column if not exists default_payment_method_id uuid references public.payment_methods (id) on delete set null,
  add column if not exists default_account_id uuid references public.accounting_accounts (id) on delete set null,
  add column if not exists default_accounting_journal_id uuid references public.accounting_journals (id) on delete set null,
  add column if not exists default_document_series_id uuid references public.document_series (id) on delete set null,
  add column if not exists is_active boolean not null default true,
  add column if not exists archived_at timestamptz,
  add column if not exists legacy_billing_customer_id uuid;

alter table public.clienti_anagrafiche drop constraint if exists clienti_anagrafiche_tipo_soggetto_chk;
alter table public.clienti_anagrafiche add constraint clienti_anagrafiche_tipo_soggetto_chk check (
  tipo_soggetto is null or tipo_soggetto in ('persona_giuridica', 'persona_fisica', 'pa', 'estero')
);

create index if not exists idx_clienti_anagrafiche_company_id
  on public.clienti_anagrafiche (company_id);

create index if not exists idx_clienti_anagrafiche_partita_iva
  on public.clienti_anagrafiche (company_id, partita_iva_normalized)
  where partita_iva_normalized is not null;

create index if not exists idx_clienti_anagrafiche_codice_fiscale
  on public.clienti_anagrafiche (company_id, codice_fiscale_normalized)
  where codice_fiscale_normalized is not null;

create index if not exists idx_clienti_anagrafiche_pec
  on public.clienti_anagrafiche (lower(pec))
  where pec is not null;

create index if not exists idx_clienti_anagrafiche_codice_destinatario
  on public.clienti_anagrafiche (codice_destinatario)
  where codice_destinatario is not null;

create index if not exists idx_clienti_anagrafiche_ragione_sociale_trgm
  on public.clienti_anagrafiche using gin (ragione_sociale gin_trgm_ops)
  where ragione_sociale is not null;

create unique index if not exists idx_clienti_anagrafiche_piva_uq
  on public.clienti_anagrafiche (company_id, partita_iva_normalized)
  where partita_iva_normalized is not null and nazione = 'IT';

create unique index if not exists idx_clienti_anagrafiche_cf_uq
  on public.clienti_anagrafiche (company_id, codice_fiscale_normalized)
  where codice_fiscale_normalized is not null and nazione = 'IT';

-- Normalize trigger
create or replace function public.clienti_anagrafiche_normalize_fiscal()
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

drop trigger if exists trg_clienti_anagrafiche_normalize_fiscal on public.clienti_anagrafiche;
create trigger trg_clienti_anagrafiche_normalize_fiscal
before insert or update on public.clienti_anagrafiche
for each row execute function public.clienti_anagrafiche_normalize_fiscal();

-- Cross-company guard
create or replace function public.admin_assert_cliente_config_same_company()
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

drop trigger if exists trg_clienti_anagrafiche_company_guard on public.clienti_anagrafiche;
create trigger trg_clienti_anagrafiche_company_guard
before insert or update on public.clienti_anagrafiche
for each row execute function public.admin_assert_cliente_config_same_company();

-- Backfill normalized columns for existing rows
update public.clienti_anagrafiche
set
  partita_iva = public.admin_normalize_partita_iva(partita_iva, coalesce(nazione, 'IT')),
  codice_fiscale = coalesce(
    public.admin_normalize_codice_fiscale(codice_fiscale, coalesce(nazione, 'IT')),
    public.admin_normalize_codice_fiscale(meta->>'codice_fiscale', coalesce(nazione, 'IT'))
  ),
  pec = public.admin_normalize_pec(pec),
  codice_destinatario = public.admin_normalize_codice_destinatario(codice_destinatario);

update public.clienti_anagrafiche
set
  partita_iva_normalized = partita_iva,
  codice_fiscale_normalized = codice_fiscale
where partita_iva_normalized is null;

comment on column public.clienti_anagrafiche.default_payment_term_id is 'Quando si paga (scadenze).';
comment on column public.clienti_anagrafiche.default_payment_method_id is 'Come si paga (strumento).';
comment on column public.clienti_anagrafiche.default_document_series_id is 'Sezionale fatture (≠ giornale contabile).';
comment on column public.clienti_anagrafiche.default_accounting_journal_id is 'Giornale contabile default per registrazioni.';

commit;
