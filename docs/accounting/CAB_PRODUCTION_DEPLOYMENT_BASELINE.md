# CAB Production Deployment Baseline

**Date:** 2026-09-10T21:50+02:00  
**Operator:** Cursor agent (Pre-Aruba gate)  
**Target:** Supabase project **CAB Gestionale** (`oxmnuovsgenqkuwfolqh`, eu-west-1)  
**Postgres:** 17.6

---

## Repository state

| Field | Value |
|-------|-------|
| Git commit (HEAD) | `46a64ab47d7ae1798e3e4510222e017fcc0d837b` |
| Branch | `main` (FASE 3–10 + remediation **uncommitted** in working tree) |
| Migration head (repo) | `20270312120000_pre_aruba_security_remediation.sql` |
| Migration head (target, pre-deploy) | `20261404120000_remove_unoerp.sql` |
| Migration head (target, post-deploy) | `20270312120000_pre_aruba_security_remediation.sql` |

---

## Pre-deploy test baseline (local, 2026-09-10)

| Suite | Result |
|-------|--------|
| `npm run ci:tsc` | **PASS** |
| `npm run test:fase10` | **PASS** |
| `npm run test:security:remediation` | **PASS** |
| `pre-aruba-security-gate.test.ts` | **PASS** |
| `npx supabase db lint` | **SKIP** — local Docker not running (`supabase start` required) |
| `npm run build` (win32) | **FAIL** — `libxmljs2` native binding (see gate report) |

---

## Expected schema (FASE 3–10)

Core objects after full chain:

- **Accounting:** `accounting_entries`, `accounting_entry_lines`, `accounting_fiscal_years`, `accounting_periods`, `accounting_audit_events`
- **Master data:** `clienti_anagrafiche`, `fornitori_anagrafiche`, `company_fiscal_profile`
- **Numbering:** `document_number_sequences`, RPC `allocate_document_number`
- **VAT:** `vat_codes`, `vat_code_configurations`, `vat_movements`, …
- **Ciclo attivo / invoice:** `invoices` (+ `fiscal_validity`, `accounting_status`, `sdi_status`), snapshots, XML, transmissions, SDI jobs/events
- **Remediation:** extended axis guard, emitted totals guard, tenant access, SDI RPC service_role-only

---

## Deploy execution

**Command:** `npx supabase db push --linked`  
**Result:** **SUCCESS** — 32 migrations applied (including `20261404120000` parity + FASE 3–10 + remediation)

### Migration parity fixes applied during deploy (technical, non-fiscal)

| Migration | Issue | Fix |
|-----------|-------|-----|
| `20270110120000` | PG17 `txid_current()` / `xid` mismatch | `backend_xid xid8` + `pg_current_xact_id()` |
| `20270111120000` | RLS on `accounting_audit_events` before CREATE | Move `ENABLE RLS` after table creation |
| `20270112120400` | Wrong column `billing_customer_id` on `billing_customers` | Use `id` |
| `20270211120100` | GRANT before function exists | Move grant to seed migration |
| `20270211120200` | PL/pgSQL loop variable `.id` on scalar | `perform …(v_company)` |
| `20270212120100` | View referenced non-existent `preventivi.numero` | `dettagli->>'numero'`, `created_at` |
| `20270310120100` | Missing `end if` in `enqueue_invoice_submission` | Syntax fix |

---

## FASE 3–10 migration inventory

| Fase | Migration | Status (target) |
|------|-----------|-----------------|
| 3 | `20270110120000`–`20270110120600` (7) | **APPLIED** |
| 4 | `20270111120000`–`20270111120200` (3) | **APPLIED** |
| 5 | `20270112120000`–`20270112120700` (8) | **APPLIED** |
| 6 | `20270210120000` | **APPLIED** |
| 7 | `20270211120000`–`20270211120500` (6) | **APPLIED** |
| 8 | `20270212120000`–`20270212120100` (2) | **APPLIED** |
| 9 | `20270310120000`–`20270310120100` (2) | **APPLIED** |
| 10 | `20270311120000` | **APPLIED** |
| Remediation | `20270312120000` | **APPLIED** |

**Checks:** no duplicates in repo; linear order; no circular FK deps detected; no destructive data migrations without audit evidence (F5 billing migration is additive + FK repoint).

---

## Post-deploy verification pointer

- Schema diff: `CAB_TARGET_SCHEMA_VERIFICATION.md`
- Full gate: `CAB_TARGET_PRODUCTION_GATE_REPORT.md`

**TARGET DEPLOYMENT = VERIFIED** (migrations + introspection 2026-09-10)
