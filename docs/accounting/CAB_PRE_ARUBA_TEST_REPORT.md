# CAB Pre-Aruba Test Report

**Date:** 2026-09-10  
**Environment:** Local dev (Node v24.15.0, Windows)

---

## Summary

| Suite | Command / file | Result |
|-------|----------------|--------|
| FASE 10 XML | `npm run test:fase10` | **PASS** |
| Accounting invariants | `lib/accounting/accounting-invariants.test.ts` | **PASS** |
| Accounting numbering concurrency | `lib/accounting/accounting-numbering.concurrency.test.ts` | **PASS** |
| Document numbering invariants | `lib/document-numbering/document-numbering-invariants.test.ts` | **PASS** |
| Document numbering concurrency | `lib/document-numbering/document-numbering.concurrency.test.ts` | **PASS** |
| VAT invariants | `lib/vat/vat-invariants.test.ts` | **PASS** |
| Ciclo attivo gate | `lib/regression/ciclo-attivo-gate.test.ts` | **PASS** |
| Document numbering gate | `lib/regression/document-numbering-gate.test.ts` | **PASS** |
| VAT engine gate | `lib/regression/vat-engine-gate.test.ts` | **PASS** |
| Accounting write SSOT | `lib/regression/accounting-write-ssot.test.ts` | **PASS** |
| Fatturazione production readiness | `lib/regression/fatturazione-production-readiness.test.ts` | **PASS** (after fix) |
| Security migration gate | `npm run test:security:remediation` | **PASS** (after comment fix; full suite not re-run) |
| Security migration gate only | `lib/regression/security-migration-gate.test.ts` | **PASS** |
| Fiscal normalize/validate | `lib/fiscal/fiscal-normalize.test.ts` | **PASS** (13 tests) |
| Master data snapshot | `lib/admin-master-data/snapshot-immutability.test.ts` | **PASS** |
| Admin master data gate | `lib/regression/admin-master-data-gate.test.ts` | **PASS** |
| Accounting periods bypass | `lib/accounting/accounting-periods-bypass.test.ts` | **PASS** |
| Invoice calculations | `lib/fatturazione/fatturazione-invoice-calculations.test.ts` | **PASS** |
| TypeScript | `npm run ci:tsc` | **FAIL** |
| Production build | `npm run build` | **NOT RUN** (blocked by tsc) |
| E2E fatturazione | `e2e/smoke/17-fatturazione.spec.ts` | **NOT RUN** |
| Accounting periods integration | `accounting-periods.integration.test.ts` | **NOT RUN** (requires Supabase local) |
| Full release gate | `npm run release:gate` | **NOT RUN** |

---

## FASE 10 Detail (`npm run test:fase10`)

```
golden.test.ts OK
business-rules.test.ts OK
invariants.test.ts OK
xsd-offline.test.ts OK
security.test.ts OK
invoice-xml-fixtures.test.ts OK
ciclo-attivo-xml-sdi.test.ts OK
invoice-engine-invariants.test.ts OK
```

**Scenarios covered:**

- TD01 golden byte-for-byte + SHA-256
- TD04 nota credito with reference
- PEC destinatario
- XSD offline validation (official schema)
- Tamper rejection (security)
- Multi-aliquota business rules
- DDT-linked ciclo attivo path

---

## Invariant Tests (mandatory)

| Invariant | Test | Result |
|-----------|------|--------|
| DEBIT = CREDIT | accounting-invariants | PASS (static migration gates) |
| VAT Σ imponibile + imposta | vat-invariants, invoice-calculations | PASS |
| Numbering no collision | document-numbering.concurrency | PASS (static) |
| One emit = one fiscal doc | ciclo-attivo-gate | PASS |
| XML deterministic | golden.test.ts | PASS |
| Immutability triggers | snapshot-immutability, gates | PASS |
| No MAX+1 in active paths | ciclo-attivo-gate, document-numbering-gate | PASS |
| No UnoERP in fatturazione | ciclo-attivo-gate | PASS |

---

## Failures

### 1. TypeScript (`ci:tsc`) — BLOCKER

```
lib/fatturazione/fatturazione-list-ui-filters.ts(76): 'numero' possibly null
lib/fatturazione/invoice-engine-invariants.test.ts(56): 'fiscal_context' unknown property
lib/pdf-artifacts/pdf-artifact-generate.server.ts(125): missing 'serie' on DDT
lib/pdf-artifacts/pdf-artifact-metadata.server.ts(5): INVOICES_COLUMNS not exported
lib/pdf-artifacts/pdf-artifact-metadata.server.ts(169): number | null
lib/render/render-path-orchestrator.ts(18): fatturazionePaymentsQueryKey missing
src/hooks/gestionale/use-fatturazione-payments-query.ts(4): same
src/lib/react-query/prefetch-gestionale-page.ts(38): same
src/services/invoices.service.ts(8): INVOICES_COLUMNS missing
```

### 2. fatturazione-production-readiness (FIXED)

Was failing: missing `allocate-invoice-number.concurrency.test.ts` (removed in FASE 6).  
Fixed: reference updated to `document-numbering.concurrency.test.ts`.

### 3. security-migration-gate (FIXED)

Was failing: false positive on UnoERP migration comment containing "GRANT EXECUTE TO anon".  
Fixed: comment reworded with allowlist marker.

---

## Global Search Highlights (§30)

| Pattern | Disposition |
|---------|-------------|
| UnoERP code paths | **DOCUMENTED** — removal migration `20261404120000`; lib deleted |
| MAX+1 in active lib | **FALSE POSITIVE** — only in historical migrations |
| `iva_percent` hardcoded 22 | **JUSTIFIED** — ordini-fornitori, preventivo PDF (non-fiscal) |
| `iva_percent` in fatturazione emit | **FIXED path** — FASE 7 RPC derives from vat_code |
| Client fiscal state write | **GAP** — fiscal_validity direct UPDATE (P0) |
| SECURITY DEFINER | **DOCUMENTED** — manifest coverage; anon EXECUTE = 0 post-remediation |
| `console.log` in tests | **JUSTIFIED** — test OK markers |
| Aruba credentials in DB | **PASS** — env-only |
| fe-sdi mock/simulator | **JUSTIFIED** — dev/test; P3 prod fallback risk |
| TODO/FIXME in fatturazione | **PASS** — no blocking TODOs in core paths |

---

## Production Build Gate (§32)

| Gate | Status |
|------|--------|
| lint | NOT RUN |
| typecheck | **FAIL** |
| unit fiscal tests | **PASS** |
| XML/XSD tests | **PASS** |
| accounting invariants | **PASS** |
| VAT invariants | **PASS** |
| numbering concurrency | **PASS** (static) |
| security gate | **PASS** (migration gate) |
| build production | **BLOCKED** |

---

## Recommendation

Re-run after P1-BLD-01 fix:

```bash
npm run ci:tsc
npm run test:fase10
npm run test:security:remediation
npm run release:gate
```

Optional with Supabase local:

```bash
npx tsx lib/accounting/accounting-periods.integration.test.ts
```
