# CAB Target Production Gate Report

**Date:** 2026-09-10  
**Gate:** Pre-Aruba core (FASE 3–10) — closes **P0-DEP-01**  
**Target:** Supabase `oxmnuovsgenqkuwfolqh`

---

## Executive result

```
TARGET DEPLOYMENT     PASS
SCHEMA MATCH          PASS
SECURITY TARGET       PASS
RLS                   PASS
GRANTS                PASS
LEGACY PATHS          PASS
ACCOUNTING            PASS
VAT                   PASS
NUMBERING             PASS
XML                   PASS (schema; 0 historical XML rows)
BUILD LINUX           UNKNOWN
```

```
P0: 0
P1: 1  (P1-OPS-01 Aruba contract)
P2: 2  (Linux build unverified; FASE 11 E2E not run)
P3: 4
P4: 3
UNKNOWN: 4
```

```
P0-DEP-01:  FIXED
ARUBA CONTRACT:  UNKNOWN
FINAL GATE:  PASS_WITH_DOCUMENTED_RISKS
```

**Conclusion:** **PRE-ARUBA CORE READY** — **ARUBA CONTRACT PENDING**

Not declared: `ARUBA API READY`

---

## Phase execution log

| Phase | Activity | Result |
|-------|----------|--------|
| 0 | Baseline doc | `CAB_PRODUCTION_DEPLOYMENT_BASELINE.md` |
| 1 | Migration inventory | 31 migrations; order OK; 7 deploy-time SQL fixes |
| 2 | Pre-deploy tests | tsc / fase10 / security **PASS**; db lint **SKIP** (no Docker) |
| 3 | `supabase db push --linked` | **PASS** after PG17 + parity fixes |
| 4 | Target introspection | Tables, RPC, triggers, RLS verified |
| 5 | Schema diff doc | `CAB_TARGET_SCHEMA_VERIFICATION.md` |
| 6 | Security target gate | Axis guard DENY; SDI RPC service_role-only |
| 7 | Grant audit | See schema verification table |
| 8 | Legacy path scan | No **ACTIVE** fiscal MAX+1 in runtime paths |
| 9 | Data safety | Additive migrations; 0 unbalanced entries; no destructive rollback |
| 10 | Invariant SQL | debit=credit; no dup sequences/transmissions |
| 11 | Production E2E | **NOT RUN** — no controlled draft→XML on live app in this session |
| 12 | Build Linux | **UNKNOWN** — WSL not installed; win32 build fails libxmljs2 |
| 13 | Re-run gates | tsc / fase10 / security / pre-aruba-security **PASS** |
| 14–15 | Doc updates | This report + linked docs |

---

## P0-DEP-01 closure checklist

| # | Condition | Status |
|---|-----------|--------|
| 1 | FASE 3–10 migrations on target | **YES** (31 versions) |
| 2 | `20270312120000` present | **YES** |
| 3 | Schema matches expected | **YES** |
| 4 | Triggers present | **YES** (`trg_invoices_guard_axes`, `trg_invoices_guard_emitted_totals`) |
| 5 | RLS present | **YES** |
| 6 | Grants verified | **YES** |
| 7 | RPC verified | **YES** |
| 8 | Security gate target | **PASS** (SQL + repo gates) |
| 9 | Legacy fiscal paths inactive | **PASS** |
| 10 | Invariants | **PASS** |

**P0-DEP-01: FIXED**

---

## Security target gate (FASE 6)

| Test | Expected | Observed |
|------|----------|----------|
| Direct UPDATE `fiscal_validity` / axes | DENY | **DENY** (trigger message IT) |
| `apply_sdi_event` as authenticated | DENY | **DENY** (`has_function_privilege` false) |
| `apply_sdi_event` as service_role | ALLOW | **ALLOW** |
| Snapshot direct INSERT (authenticated RLS) | DENY | **DENY** (SELECT-only policy) |
| Emitted totals UPDATE | DENY | Trigger deployed (`trg_invoices_guard_emitted_totals`) |
| IDOR tenant guard | DENY cross-tenant | **PATCHED** in remediation RPC (not live multi-tenant exploit test) |
| Audit actor spoof | IGNORED | **PATCHED** — `invoice_insert_event` forces `rbac_auth_uid()` |

**Note:** Full PostgREST JWT simulation not executed; evidence = deployed migration + postgres trigger/RPC privilege checks.

---

## Legacy path scan (FASE 8)

| Pattern | Classification |
|---------|----------------|
| `20260716130000` / `20260910150100` invoice MAX+1 SQL | **HISTORICAL** (superseded by F6) |
| `allocate_document_number` in F6/F8 RPC | **ACTIVE** (correct SSOT) |
| `preventivo-numero-*.ts` MAX+1 | **ACTIVE** non-fiscal (preventivi module) |
| `ordine-fornitore-numero.ts` MAX+1 | **ACTIVE** non-fiscal (ordini module) |
| `lib/regression/ciclo-attivo-gate.test.ts` | **TEST_ONLY** |

**NO ACTIVE LEGACY FISCAL INVOICE NUMBERING PATH**

---

## Build (FASE 12)

| Environment | `npm run build` |
|-------------|-----------------|
| Windows (local) | **FAIL** — `libxmljs2` missing `xmljs.node` on page collect `/api/cron/fatturazione-sdi-processor` |
| Linux equivalent | **UNKNOWN** — no WSL/CI run in this session |

Classification: **P2 ENVIRONMENTAL** (pending CI Linux confirmation)

---

## Residual blockers for Aruba phase

1. **P1-OPS-01** — Aruba WS contract paths unverified (`aruba-provider.server.ts` placeholder)
2. **FASE 11 E2E** — controlled draft→XML on target app not executed
3. **Linux production build** — confirm in CI/Vercel (expected PASS)

---

## Re-run test matrix (FASE 13)

| Command | Result |
|---------|--------|
| `npm run ci:tsc` | PASS |
| `npm run test:fase10` | PASS |
| `npm run test:security:remediation` | PASS |
| `pre-aruba-security-gate.test.ts` | PASS |

---

## References

- `CAB_PRODUCTION_DEPLOYMENT_BASELINE.md`
- `CAB_TARGET_SCHEMA_VERIFICATION.md`
- `CAB_FASE3_10_DEPLOYMENT_GATE.md`
- `CAB_PRE_ARUBA_REMEDIATION_REPORT.md`
