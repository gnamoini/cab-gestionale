# CAB FASE 3–10 Deployment Gate

**Date:** 2026-09-10 (updated post-deploy)  
**Rule:** migration in repository ≠ migration on target production

**TARGET DEPLOYMENT = VERIFIED** (2026-09-10, project `oxmnuovsgenqkuwfolqh`)

---

## Migration chain

| Fase | Migration prefix | Local repo | Target prod | Verified | Risk |
|------|------------------|:----------:|:-----------:|:--------:|------|
| 3 | `20270110120000`–`20270110120600` | YES | **YES** | **YES** | — |
| 4 | `20270111120000`–`20270111120200` | YES | **YES** | **YES** | — |
| 5 | `20270112120000`–`20270112120700` | YES | **YES** | **YES** | — |
| 6 | `20270210120000` | YES | **YES** | **YES** | — |
| 7 | `20270211120000`–`20270211120500` | YES | **YES** | **YES** | — |
| 8 | `20270212120000`–`20270212120100` | YES | **YES** | **YES** | — |
| 9 | `20270310120000`–`20270310120100` | YES | **YES** | **YES** | — |
| 10 | `20270311120000` | YES | **YES** | **YES** | — |
| Remediation | `20270312120000` | YES | **YES** | **YES** | — |

Migration head on target: **`20270312120000`**

---

## Target verification (executed 2026-09-10)

```sql
-- All returned true on oxmnuovsgenqkuwfolqh:
select exists(select 1 from pg_proc where proname = 'allocate_document_number');
select exists(select 1 from pg_proc where proname = 'apply_sdi_event');
select exists(select 1 from information_schema.columns
  where table_name = 'invoices' and column_name = 'fiscal_validity');
select exists(select 1 from information_schema.tables
  where table_name = 'invoice_xml_documents');
select exists(select 1 from pg_trigger where tgname = 'trg_invoices_guard_axes');
select exists(select 1 from pg_trigger where tgname = 'trg_invoices_guard_emitted_totals');
select version from supabase_migrations.schema_migrations
  where version = '20270312120000';
```

Full diff: `CAB_TARGET_SCHEMA_VERIFICATION.md`  
Gate report: `CAB_TARGET_PRODUCTION_GATE_REPORT.md`

Ops scripts (optional post-deploy audit):

- `scripts/ops/fase5-pre-migration-audit.sql`
- `scripts/ops/fase6-numbering-pre-migration-audit.sql`

---

## Legacy path scan (post-deploy)

| Location | Classification |
|----------|----------------|
| `20260716130000_fatturazione_module.sql` | HISTORICAL (superseded by F6) |
| `20260910150100_fatturazione_erp_phase1b.sql` | HISTORICAL |
| `lib/regression/ciclo-attivo-gate.test.ts` | TEST_ONLY |
| Active emit RPC `allocate_document_number` | ACTIVE (correct SSOT) |

**No active legacy fiscal invoice numbering path on target.**

---

## Gate status

**DEPLOYMENT: PASS** — target schema verified 2026-09-10.

**P0-DEP-01: FIXED**

Remaining for Aruba phase (not this gate):

- P1-OPS-01 Aruba contract UNKNOWN
- FASE 11 controlled E2E on production app
- Linux build confirmation (CI)
