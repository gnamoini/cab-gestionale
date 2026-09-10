# CAB Pre-Aruba Remediation Baseline

**Date:** 2026-09-10  
**Source audit:** `CAB_PRE_ARUBA_AUDIT.md`  
**Mode:** Verified against repository before remediation

---

## P0 Findings

| ID | File / function | Risk | Root cause | Remediation | Tests |
|----|-----------------|------|------------|-------------|-------|
| P0-SEC-01 | `invoice_guard_direct_axes_update()` — `20260910150500` | Forge `fiscal_validity` / `accounting_status` via PostgREST | Trigger guarded only 3 axes | Extend trigger + column list | `pre-aruba-security-gate.test.ts` |
| P0-DEP-01 | Migrations `202701*`–`202703*` | Legacy numbering/VAT paths on target | Migrations in repo ≠ deployed | `CAB_FASE3_10_DEPLOYMENT_GATE.md` — **UNKNOWN** until target verified | ops audit SQL |

---

## P1 Findings

| ID | File / function | Risk | Root cause | Remediation | Tests |
|----|-----------------|------|------------|-------------|-------|
| P1-SEC-01 | `apply_sdi_event` — `20270310120100` L66–71 | Staff forges SdI DELIVERY | GRANT `authenticated` + `write` guard | REVOKE authenticated; service_role only | manifest + security gate |
| P1-SEC-02 | Invoice DEFINER RPCs | Cross-company IDOR | No `company_id` check | `invoice_assert_tenant_access` + draft RPC patch | static gate |
| P1-SEC-03 | `invoice_insert_event` — `20261226120500` | Audit actor spoof | Client supplies `p_actor_id` | Force `rbac_auth_uid()` unless service_role | migration SQL |
| P1-BLD-01 | TS: `INVOICES_COLUMNS`, query keys, null numero | Build blocked | Incomplete FASE 8–10 type sync | Restore columns/types | `npm run ci:tsc` |
| P1-DRIFT-01 | `calculateInvoiceTotals()` wizard vs DB RPC | UI totals ≠ emit | Intentional preview; DB authoritative on emit | Documented; no semantic change | existing calc tests |
| P1-OPS-01 | `aruba-provider.server.ts` | LIVE failure | Placeholder WS paths | **BLOCKED/UNKNOWN** — no invented API | `CAB_ARUBA_READINESS.md` |

---

## P2 Addressed in this pass

| ID | Remediation |
|----|-------------|
| P2-SEC-01 | `invoice_guard_emitted_totals_update` — block imponibile/iva/totale change when `document_status = emessa` |
| P2-SEC-02 | `invoice_fatturapa_snapshots` — SELECT-only RLS for authenticated |
| P2-SEC-03 | Webhook — removed service_role Bearer; constant-time secret compare |

---

## Verification commands

```bash
npm run ci:tsc
npm run test:fase10
npx tsx lib/regression/pre-aruba-security-gate.test.ts
npm run test:security:remediation
```
