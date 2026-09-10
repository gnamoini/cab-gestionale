# FASE 5 STATUS REPORT

```
FASE 5 STATUS: PASS (pending deploy migration apply + CI)
```

## DATABASE

- **files/migrations:** `20270112120000` … `20270112120700`
- **tables created:** `fiscal_regimes`, `document_series`, `admin_master_data_conflicts`, `admin_billing_customer_migration_map`, `cliente_bank_accounts`, `fornitori_anagrafiche`, `fornitore_bank_accounts`
- **tables modified:** `clienti_anagrafiche`, `invoices`, `customer_open_items`, `customer_payments`, `receivables`, `mezzi`, `preventivi`, `ddt_documents`, `ordini_fornitori`, `inventory_documents`, `payables`
- **tables removed (A8):** `billing_customers`, `billing_customer_profiles`
- **constraints:** fiscal UNIQUE scoped `company_id`; cross-company guard triggers; IBAN normalized
- **indexes:** P.IVA, CF, PEC, codice_destinatario, FK documentali
- **RLS:** SELECT operational; writes RPC-only on master tables

## CLIENT

- **fields:** identity, fiscal, e-invoicing, payment defaults, accounting FKs, `document_series` vs `accounting_journals` separated
- **validations:** `lib/fiscal/validate.ts` + SQL triggers
- **references:** `clienti_anagrafiche.id` → invoices/receivables/documents

## SUPPLIER

- **fields:** parallel to cliente on `fornitori_anagrafiche`
- **validations:** same normalization stack
- **references:** `fornitore_id` on ordini/payables/inventory

## IDENTITY

- **internal ID:** UUID PK
- **fiscal identifiers:** normalized columns + partial UNIQUE (IT)
- **entity_key:** LEGACY_TECHNICAL only
- **text matching:** removed as definitive identity; suggest-only for import

## MIGRATION

- **records migrated:** billing → clienti via `admin_billing_customer_migration_map`
- **conflicts:** `admin_master_data_conflicts` REVIEW_REQUIRED
- **unresolved:** manual resolution path via `admin_list_master_data_conflicts`

## ACCOUNTING

- **chart-of-accounts:** `default_account_id` → `accounting_accounts`
- **sectional:** `default_document_series_id` → `document_series` (not giornale contabile)
- **payment:** `default_payment_term_id` (when) + `default_payment_method_id` (how)

## HISTORICAL DATA

- **snapshots:** invoice/DDT `customer_snapshot` unchanged by anagrafica edits
- **regression:** gate tests in `lib/regression/admin-master-data-gate.test.ts`

## SECURITY

- **RLS:** tenant `company_id`; RPC single-writer
- **authorization:** `admin_master_data_rbac_can`

## TESTS

- **unit:** `lib/fiscal/fiscal-normalize.test.ts`
- **integration:** `lib/admin-master-data/snapshot-immutability.test.ts`
- **database:** migration SQL invariants gate
- **regression:** `billing-customers-removal-gate.test.ts`

## FILES CREATED

- `docs/accounting/CAB_Administrative_Master_Data.md`
- `docs/accounting/FASE5_STATUS_REPORT.md`
- `lib/fiscal/*`, `lib/admin-master-data/*`
- `supabase/migrations/2027011212*.sql`
- `app/api/admin/master-data/**`
- `components/dashboard/settings/cliente-pagamenti-contabilita-fields.tsx`
- `scripts/ops/fase5-pre-migration-audit.sql`

## REMAINING RISKS

- Apply migrations on staging before production
- Manual conflict resolution for duplicate fiscal IDs
- `mezzi.cliente` / `preventivi.cliente` still OPERATIONAL text until full filter migration
- Reference data pickers (payment_terms UI) — IDs settable via RPC/API

## NEXT PHASE

- Fatturazione elettronica / SDI engine on top of anagrafica SSOT
- Scadenziario using `payment_terms` structure
