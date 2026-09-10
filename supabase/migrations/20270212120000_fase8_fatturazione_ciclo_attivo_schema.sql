-- FASE 8 — Ciclo Attivo schema: cedente, TD, fiscal_validity, snapshot, allocation, SDI jobs.
begin;

-- ---------------------------------------------------------------------------
-- Cedente SSOT (prerequisito FINALIZE/EMIT)
-- ---------------------------------------------------------------------------
create table if not exists public.company_fiscal_profile (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies (id) on delete restrict,
  ragione_sociale text not null,
  partita_iva text,
  codice_fiscale text,
  indirizzo text,
  cap text,
  comune text,
  provincia text,
  nazione text not null default 'IT',
  pec text,
  codice_destinatario text,
  regime_fiscale text,
  fiscal_regime_id uuid references public.fiscal_regimes (id) on delete set null,
  sales_journal_id uuid references public.accounting_journals (id) on delete set null,
  customer_receivable_account_id uuid references public.accounting_accounts (id) on delete set null,
  sales_revenue_account_id uuid references public.accounting_accounts (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_fiscal_profile_ragione_chk check (char_length(trim(ragione_sociale)) > 0)
);

drop trigger if exists trg_company_fiscal_profile_updated_at on public.company_fiscal_profile;
create trigger trg_company_fiscal_profile_updated_at
before update on public.company_fiscal_profile
for each row execute function public.set_updated_at();

alter table public.company_fiscal_profile enable row level security;

drop policy if exists cap_company_fiscal_profile_select on public.company_fiscal_profile;
create policy cap_company_fiscal_profile_select on public.company_fiscal_profile
for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_company_fiscal_profile_write on public.company_fiscal_profile;
create policy cap_company_fiscal_profile_write on public.company_fiscal_profile
for all to authenticated
using (public.rbac_module_can('fatturazione', 'write'))
with check (public.rbac_module_can('fatturazione', 'write'));

grant select, insert, update on public.company_fiscal_profile to authenticated;

insert into public.notification_type_registry (
  type, allowed_scope_type, allowed_scope_value, allowed_scope_module, default_priority, caller_min_role
)
values
  ('fattura_sdi_scartata', 'role', 'addetto_amministrativo', 'fatturazione', 'high', 'staff'),
  ('fattura_sdi_consegnata', 'role', 'addetto_amministrativo', 'fatturazione', 'medium', 'staff'),
  ('fattura_sdi_consegna_fallita', 'role', 'addetto_amministrativo', 'fatturazione', 'high', 'staff')
on conflict (type) do nothing;

-- ---------------------------------------------------------------------------
-- invoices — fiscal axes + snapshot + payment term + TD
-- ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists fattura_pa_tipo_documento text not null default 'TD01',
  add column if not exists fiscal_validity text not null default 'not_applicable',
  add column if not exists data_effettuazione date,
  add column if not exists payment_term_id uuid references public.payment_terms (id) on delete set null,
  add column if not exists invoice_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists fiscal_transmission_attempt integer not null default 0,
  add column if not exists legacy_origin text not null default 'NATIVE_CAB';

alter table public.invoices drop constraint if exists invoices_fattura_pa_tipo_documento_chk;
alter table public.invoices add constraint invoices_fattura_pa_tipo_documento_chk check (
  fattura_pa_tipo_documento in ('TD01', 'TD04', 'TD05', 'TD24', 'TD25')
);

alter table public.invoices drop constraint if exists invoices_fiscal_validity_chk;
alter table public.invoices add constraint invoices_fiscal_validity_chk check (
  fiscal_validity in ('not_applicable', 'pending', 'validly_issued', 'not_validly_issued')
);

alter table public.invoices drop constraint if exists invoices_legacy_origin_chk;
alter table public.invoices add constraint invoices_legacy_origin_chk check (
  legacy_origin in ('NATIVE_CAB', 'LEGACY_IMPORTED')
);

alter table public.invoices drop constraint if exists invoices_origine_chk;
alter table public.invoices add constraint invoices_origine_chk check (
  origine is null or origine in (
    'manuale', 'preventivo', 'multi_preventivo', 'lavorazione', 'consuntivo', 'ddt'
  )
);

alter table public.invoices drop constraint if exists invoices_document_type_chk;
alter table public.invoices add constraint invoices_document_type_chk check (
  document_type in ('fattura', 'nota_credito', 'nota_debito', 'proforma')
);

alter table public.invoices drop constraint if exists invoices_sdi_status_chk;
alter table public.invoices add constraint invoices_sdi_status_chk check (
  sdi_status is null or sdi_status in (
    'non_applicabile', 'da_generare', 'generata', 'inviata',
    'accettata', 'consegnata', 'impossibilita_consegna', 'scartata', 'rifiutata'
  )
);

alter table public.invoices drop constraint if exists invoices_accounting_status_chk;
alter table public.invoices add constraint invoices_accounting_status_chk check (
  accounting_status in (
    'non_rilevante', 'da_registrare', 'registrata', 'stornata',
    'da_liquidare', 'liquidata', 'chiusa', 'contestata'
  )
);

alter table public.invoices drop constraint if exists invoices_snapshot_obj_chk;
alter table public.invoices add constraint invoices_invoice_snapshot_obj_chk check (
  jsonb_typeof(invoice_snapshot) = 'object'
);

create index if not exists idx_invoices_fiscal_validity on public.invoices (fiscal_validity);
create index if not exists idx_invoices_fattura_pa_tipo on public.invoices (fattura_pa_tipo_documento);

comment on column public.invoices.invoice_snapshot is
  'FASE 8 — snapshot di emissione immutabile dopo finalize/emit.';
comment on column public.invoices.fiscal_validity is
  'FASE 8 — validità fiscale distinta da document_status.';

-- ---------------------------------------------------------------------------
-- invoice_rows source provenance
-- ---------------------------------------------------------------------------
alter table public.invoice_rows
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists source_row_id uuid;

alter table public.invoice_rows drop constraint if exists invoice_rows_source_type_chk;
alter table public.invoice_rows add constraint invoice_rows_source_type_chk check (
  source_type is null or source_type in (
    'preventivo', 'consuntivo', 'lavorazione', 'ddt', 'manuale'
  )
);

-- ---------------------------------------------------------------------------
-- invoice_links — consuntivo + source_row_id + unique
-- ---------------------------------------------------------------------------
alter table public.invoice_links
  add column if not exists source_row_id uuid;

alter table public.invoice_links drop constraint if exists invoice_links_source_type_chk;
alter table public.invoice_links add constraint invoice_links_source_type_chk check (
  source_type in (
    'preventivo', 'consuntivo', 'lavorazione', 'mezzo', 'attrezzatura', 'ricambio', 'ddt'
  )
);

create unique index if not exists idx_invoice_links_source_uq
  on public.invoice_links (
    invoice_id,
    source_type,
    source_id,
    coalesce(source_row_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- ---------------------------------------------------------------------------
-- FatturaPA snapshots — versioned append-only corrections
-- ---------------------------------------------------------------------------
alter table public.invoice_fatturapa_snapshots
  add column if not exists version integer not null default 1,
  add column if not exists correction_of uuid references public.invoice_fatturapa_snapshots (id) on delete set null,
  add column if not exists reason text;

create unique index if not exists idx_invoice_fatturapa_snapshots_version_uq
  on public.invoice_fatturapa_snapshots (invoice_id, version);

alter table public.invoice_fatturapa_snapshots drop constraint if exists invoice_fatturapa_snapshots_uq;

create or replace function public.invoice_guard_fatturapa_snapshot_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'fatturapa_snapshot_immutable';
end;
$$;

drop trigger if exists trg_invoice_fatturapa_snapshot_append_only on public.invoice_fatturapa_snapshots;
create trigger trg_invoice_fatturapa_snapshot_append_only
before update or delete on public.invoice_fatturapa_snapshots
for each row execute function public.invoice_guard_fatturapa_snapshot_append_only();

-- ---------------------------------------------------------------------------
-- SDI jobs (coda distinta da notification_outbox)
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_sdi_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  snapshot_id uuid references public.invoice_fatturapa_snapshots (id) on delete set null,
  status text not null default 'PENDING',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  last_error_code text,
  provider text not null default 'simulator',
  provider_reference text,
  sdi_reference text,
  idempotency_key text not null,
  correlation_key text not null,
  filename text,
  xml_hash text,
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_sdi_jobs_status_chk check (
    status in ('PENDING', 'PROCESSING', 'SUBMITTED', 'SYNCED', 'RETRY', 'FAILED', 'BLOCKED')
  ),
  constraint invoice_sdi_jobs_idempotency_uq unique (idempotency_key)
);

create index if not exists idx_invoice_sdi_jobs_claim
  on public.invoice_sdi_jobs (status, next_attempt_at)
  where status in ('PENDING', 'RETRY');

create index if not exists idx_invoice_sdi_jobs_invoice on public.invoice_sdi_jobs (invoice_id);

-- Webhook notification-id idempotency (distinct from jobs outbox)
create table if not exists public.invoice_sdi_webhook_receipts (
  notification_id text primary key,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  outcome text not null,
  received_at timestamptz not null default now()
);

alter table public.invoice_sdi_webhook_receipts enable row level security;
revoke all on public.invoice_sdi_webhook_receipts from public, anon, authenticated;
grant select, insert on public.invoice_sdi_webhook_receipts to service_role;

drop trigger if exists trg_invoice_sdi_jobs_updated_at on public.invoice_sdi_jobs;
create trigger trg_invoice_sdi_jobs_updated_at
before update on public.invoice_sdi_jobs
for each row execute function public.set_updated_at();

alter table public.invoice_sdi_jobs enable row level security;

drop policy if exists cap_invoice_sdi_jobs_select on public.invoice_sdi_jobs;
create policy cap_invoice_sdi_jobs_select on public.invoice_sdi_jobs
for select to authenticated
using (public.rbac_module_can('fatturazione', 'read'));

drop policy if exists cap_invoice_sdi_jobs_write on public.invoice_sdi_jobs;
create policy cap_invoice_sdi_jobs_write on public.invoice_sdi_jobs
for all to authenticated
using (public.rbac_module_can('fatturazione', 'sdi_admin'))
with check (public.rbac_module_can('fatturazione', 'sdi_admin'));

-- ---------------------------------------------------------------------------
-- Open items: cancelled (reversal tecnico, non DELETE)
-- ---------------------------------------------------------------------------
alter table public.customer_open_items drop constraint if exists customer_open_items_status_chk;
alter table public.customer_open_items add constraint customer_open_items_status_chk check (
  status in ('open', 'partial', 'closed', 'cancelled')
);

alter table public.receivables drop constraint if exists receivables_status_chk;
alter table public.receivables add constraint receivables_status_chk check (
  status in ('open', 'partial', 'closed', 'cancelled')
);

-- ---------------------------------------------------------------------------
-- Numbering: nota_debito
-- ---------------------------------------------------------------------------
alter table public.document_number_sequences drop constraint if exists document_number_sequences_document_type_chk;
alter table public.document_number_sequences add constraint document_number_sequences_document_type_chk check (
  document_type in ('fattura', 'nota_credito', 'nota_debito', 'ddt')
);

-- ---------------------------------------------------------------------------
-- Emission snapshot immutability
-- ---------------------------------------------------------------------------
create or replace function public.invoice_guard_emission_snapshot_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.document_status is distinct from 'emessa' and old.fiscal_validity in ('not_applicable') then
    return new;
  end if;
  if coalesce(old.document_status, '') <> 'emessa' and coalesce(old.fiscal_validity, 'not_applicable') = 'not_applicable' then
    return new;
  end if;
  if coalesce(old.document_status, '') = 'emessa'
     or old.fiscal_validity in ('pending', 'validly_issued', 'not_validly_issued')
  then
    if new.invoice_snapshot is distinct from old.invoice_snapshot
       or new.numero is distinct from old.numero
       or new.anno is distinct from old.anno
       or new.series is distinct from old.series
       or new.imponibile is distinct from old.imponibile
       or new.iva is distinct from old.iva
       or new.totale is distinct from old.totale
       or new.fattura_pa_tipo_documento is distinct from old.fattura_pa_tipo_documento
       or new.data_emissione is distinct from old.data_emissione
       or new.customer_id is distinct from old.customer_id
    then
      if coalesce(current_setting('invoice.emission_rewrite', true), '') <> 'true' then
        raise exception 'invoice_snapshot_immutable';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoice_emission_snapshot_immutable on public.invoices;
create trigger trg_invoice_emission_snapshot_immutable
before update on public.invoices
for each row execute function public.invoice_guard_emission_snapshot_immutable();

-- ---------------------------------------------------------------------------
-- Seed DEMO cedente + conti minimi (idempotente)
-- ---------------------------------------------------------------------------
insert into public.accounting_accounts (company_id, code, description, account_type, nature, active)
values
  ('00000000-0000-4000-8000-000000000001'::uuid, '1210', 'Clienti', 'asset', 'debit', true),
  ('00000000-0000-4000-8000-000000000001'::uuid, '3110', 'Ricavi vendite', 'revenue', 'credit', true),
  ('00000000-0000-4000-8000-000000000001'::uuid, '2601', 'IVA ns/debiti', 'liability', 'credit', true)
on conflict (company_id, code) do nothing;

insert into public.company_fiscal_profile (
  company_id, ragione_sociale, partita_iva, codice_fiscale,
  indirizzo, cap, comune, provincia, nazione, pec, codice_destinatario,
  regime_fiscale, sales_journal_id, customer_receivable_account_id, sales_revenue_account_id
)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  'CAB Officina DEMO',
  '00000000000',
  '00000000000',
  'Via Demo 1',
  '00100',
  'Roma',
  'RM',
  'IT',
  'demo@pec.example.it',
  '0000000',
  'RF01',
  (select id from public.accounting_journals where company_id = '00000000-0000-4000-8000-000000000001'::uuid and code = 'GEN' limit 1),
  (select id from public.accounting_accounts where company_id = '00000000-0000-4000-8000-000000000001'::uuid and code = '1210' limit 1),
  (select id from public.accounting_accounts where company_id = '00000000-0000-4000-8000-000000000001'::uuid and code = '3110' limit 1)
where exists (
  select 1 from public.companies where id = '00000000-0000-4000-8000-000000000001'::uuid
)
on conflict (company_id) do nothing;

-- ---------------------------------------------------------------------------
-- Classify existing emitted invoices as LEGACY_IMPORTED (no rewrite)
-- ---------------------------------------------------------------------------
update public.invoices
set legacy_origin = 'LEGACY_IMPORTED'
where numero is not null
  and coalesce(document_status, status) not in ('bozza', 'da_verificare')
  and (invoice_snapshot = '{}'::jsonb or invoice_snapshot is null);

commit;

notify pgrst, 'reload schema';
