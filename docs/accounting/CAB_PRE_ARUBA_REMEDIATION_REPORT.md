# CAB Pre-Aruba Remediation Report

**Date:** 2026-09-10  
**Scope:** P0/P1 technical remediation (no Aruba LIVE, no fiscal semantic changes)

---

## FIXED

| ID | Root cause | Change | Test |
|----|------------|--------|------|
| P0-SEC-01 | Axis trigger omitted `fiscal_validity`, `accounting_status` | `20270312120000_pre_aruba_security_remediation.sql` extends guard + trigger columns | `pre-aruba-security-gate.test.ts` |
| P1-SEC-01 | `apply_sdi_event` granted to `authenticated` | REVOKE authenticated; service_role only | manifest + security gate |
| P1-SEC-02 | No tenant guard on draft RPC | `invoice_assert_tenant_access` + `update_invoice_draft_with_rows` patch | migration SQL |
| P1-SEC-03 | Client-controlled `p_actor_id` | Force `rbac_auth_uid()` unless service_role | migration SQL |
| P1-BLD-01 | Missing `INVOICES_COLUMNS`, query keys, type drift | `table-select-columns.ts`, `query-key-factory.ts`, test fixtures, `map-cab-invoice.server.ts` | `npm run ci:tsc` **PASS** |
| P2-SEC-01 | Emitted totals PATCH | `invoice_guard_emitted_totals_update` trigger | migration SQL |
| P2-SEC-02 | Client snapshot INSERT | RLS SELECT-only for authenticated on `invoice_fatturapa_snapshots` | migration SQL |
| P2-SEC-03 | Webhook service_key Bearer | Removed; constant-time secret compare | `pre-aruba-security-gate.test.ts` |
| P2-TEST | Stale production-readiness test path | → `document-numbering.concurrency.test.ts` | production-readiness gate |

---

## NOT FIXED (documented)

| ID | Reason |
|----|--------|
| ~~P0-DEP-01~~ | ~~Requires target DB migration deploy~~ → **FIXED 2026-09-10** — `CAB_TARGET_PRODUCTION_GATE_REPORT.md` |
| P1-OPS-01 | Aruba WS contract **BLOCKED/UNKNOWN** — no invented endpoints |
| P1-DRIFT-01 | Wizard preview totals intentional; DB authoritative on emit — no semantic change requested |
| P2-GOV-01 | FASE 2 spec still DRAFT — commercialista decision |
| BUILD-NATIVE | `libxmljs2` native binding missing on Windows build collect — **P2 ENVIRONMENTAL**; Linux CI not run in gate session |
| E2E-PROD | FASE 11 controlled draft→XML on live app **NOT RUN** in gate session |

---

## UNKNOWN

| ID | Topic |
|----|-------|
| U-DEPLOY | Production schema state |
| U-ARUBA | Exact API paths, auth, polling contract |
| U-BOLLO | Automatic bollo rules |
| U-CONSERV | LTA provider |

---

## Test results (post-remediation)

| Suite | Result |
|-------|--------|
| `npm run ci:tsc` | **PASS** |
| `npm run test:fase10` | **PASS** |
| `npm run test:security:remediation` | **PASS** |
| `pre-aruba-security-gate.test.ts` | **PASS** |
| `npm run build` | **FAIL** (libxmljs2 `.node` binding on win32 collect) |

---

## Gate reassessment (post target deploy 2026-09-10)

```
P0: 0  (P0-DEP-01 FIXED, P0-SEC-01 FIXED on target)
P1: 1  (P1-OPS-01 Aruba contract UNKNOWN)
P2: 2  (Linux build unverified; FASE 11 E2E not run)
P3: 4
P4: 3
UNKNOWN: 4
```

**FINAL GATE: PASS_WITH_DOCUMENTED_RISKS**

**Conclusion: PRE-ARUBA CORE READY — ARUBA CONTRACT PENDING**

Remaining blockers for Aruba API phase:
1. Aruba commercial/API contract verification
2. Confirm Linux production build (CI/Vercel)
3. Controlled production E2E (draft→XML, no SdI send)
