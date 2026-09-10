# FASE 3 — Audit Inventory

**Date:** 2026-09-10  
**Status:** STEP A complete (read-only audit)

## Current Accounting Inventory

### Tables (existing)

| Table | Migration | Notes |
|-------|-----------|-------|
| `accounting_entries` | `20260910150300_fatturazione_erp_phase3.sql` | Minimal header; `status` default `posted`; no `company_id` |
| `accounting_entry_lines` | same | `account_code` free text; `ON DELETE CASCADE` |
| `billing_settings` | same | Key/value JSONB |

**Extensions:** `entry_origin` in `20260910150800_fatturazione_completions_validation.sql`

### Functions / RPC

No accounting-specific RPC exists. No `post_accounting_entry`, `create_accounting_entry`, etc.

### RLS (existing)

- Module: `fatturazione` (not `contabilita`)
- Policy: `FOR ALL` with `rbac_module_can('fatturazione', read/write)`
- Direct client INSERT/UPDATE allowed — **must be revoked in FASE 3**

### TypeScript usage

- `components/fatturazione/sections/fatturazione-contabilita-section.tsx` — SELECT only
- `src/types/supabase-tables.ts` — `AccountingEntryRow`, `AccountingEntryLineRow` (missing `entry_origin`)

## Domain Dependencies

| Source | Relationship |
|--------|--------------|
| `invoices` | `accounting_entries.invoice_id` FK |
| `customer_open_items` | Operational AR; bridge via `receivables.operational_open_item_id` |
| `billing_customers` | Customer fiscal master for receivables |
| `preventivi`, `ddt_documents`, `ordini_fornitori` | Future document→entry sources (not FASE 3) |

## Migration Risks

1. **`ON DELETE CASCADE`** on `accounting_entry_lines` → change to `RESTRICT`
2. **Default `status = posted`** → change to `draft`; backfill existing rows if any
3. **`account_code` free text** → add `account_id` FK + snapshot at posting
4. **No `company_id`** → backfill from `rbac_user_company_id()` / default company `00000000-0000-4000-8000-000000000001`
5. **RLS module change** → new `contabilita` module; fatturazione UI read may need both during transition

## Naming

- Plan adopts `accounting_accounts` (not `chart_of_accounts` from FASE 2 gap doc)
- Migration batch: `20270110120000`–`20270110120600`

## Security Manifest Baseline

No accounting RPCs in `docs/security/rpc-access-manifest.json`. FASE 3 adds 7 RPCs.

## Reusable Patterns

- `rbac_user_company_id()` — tenant isolation
- `set_config(..., true)` — SET LOCAL single-writer (`20261226121100`)
- `allocate_invoice_number` — counter + FOR UPDATE
- `stock_apply_movement` — idempotency early-return
- `invoice_write_status_axes` — SSOT status transitions
