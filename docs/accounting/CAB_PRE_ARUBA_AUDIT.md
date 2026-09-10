# CAB Pre-Aruba API Audit — FASI 1–10

**Gate:** `PRE_DIGITAL_FISCAL_PRODUCTION_READY`  
**Date:** 2026-09-10  
**Mode:** Read-only baseline + documented remediation + safe test-gate fixes  
**Auditor:** Automated repository audit (Cursor agent)

---

## Executive Summary

CAB FASI 1–10 implement a coherent fiscal stack: accounting engine (F3), periods (F4), admin master data (F5), centralized numbering (F6), VAT engine (F7), ciclo attivo emit transaction (F8), invoice/SDI state machine (F9), and isolated FatturaPA XML engine (F10). Architecture follows **single writer + explicit state machine + deterministic XML**.

**Verdict:** **PRE-ARUBA CORE READY** — **NOT ARUBA API READY**

Primary blockers (updated 2026-09-10 post-deploy):

1. ~~**P0 security:** direct PostgREST UPDATE of `fiscal_validity` / `accounting_status`~~ → **FIXED on target** (`20270312120000`)
2. ~~**P1 deploy:** FASE 3–10 migrations not verified on target~~ → **FIXED** — see `CAB_TARGET_PRODUCTION_GATE_REPORT.md`
3. **P1 ops:** Aruba WS contract paths unverified against live API (**P1-OPS-01**)
4. ~~**P1 build:** TypeScript gate FAIL~~ → **FIXED** (`ci:tsc` PASS)
5. **UNKNOWN governance:** FASE 2 fiscal specification still DRAFT (commercialista sign-off pending)
6. **UNKNOWN ops:** Aruba WS contract paths unverified against live API

XML engine (F10), VAT invariants, numbering concurrency gates, and accounting static invariants **PASS** in CI-style tests. Core design is Aruba-ready at the adapter boundary; production gate is blocked by security + deploy + typecheck.

---

## Scope

| In scope | Out of scope |
|----------|--------------|
| FASI 1–10 (gap → XML engine) | FASE 11 live Aruba integration |
| Ciclo attivo, NC, DDT-linked TD24/25 | Full esterometro / autofattura TD16–23 |
| Numerazione FASE 6 | Ordini-fornitori IVA hub (separate module) |
| Contabilità FASE 3–4 | Conservazione sostitutiva a norma (provider esterno) |
| XML FatturaPA 1.3.1 baseline | Live SdI submission |

---

## Methodology

1. Repository scan: migrations `202701*`–`202703*`, `lib/accounting`, `lib/fatturazione`, `lib/vat`, `lib/document-numbering`, `lib/fiscal`
2. RPC manifest + RLS policy review (`docs/security/rpc-access-manifest.json`)
3. Global search: legacy numbering, hardcoded IVA, UnoERP, SECURITY DEFINER, client fiscal writes
4. Test execution: `test:fase10`, fiscal gate tests, security remediation gate, `ci:tsc`
5. Normative cross-check against official sources (see `CAB_FISCAL_COMPLIANCE_MATRIX.md`)
6. Safe fixes only per audit rule §26 (test gate drift, false-positive security scan)

---

## Architecture (current)

```text
Master data (F5)     clienti_anagrafiche / fornitori_anagrafiche / company_fiscal_profile
        ↓ snapshot at emit
VAT Engine (F7)      vat_codes → vat_validate_document / vat_resolve_configuration
        ↓
Numbering (F6)       allocate_document_number() — INTERNAL_ONLY
        ↓
Emit TX (F8)         create/emit RPC: numbering + VAT + accounting + SDI job
        ↓
Invoice engine (F9)  axes: document_status | fiscal_validity | sdi_status | accounting_status
                     transport: invoice_transmissions | events: invoice_sdi_events
        ↓
XML (F10)            lib/accounting/einvoice/** → invoice_xml_documents (immutable blob + hash)
        ↓
Transmission (F11)   fe-sdi adapter → ArubaElectronicInvoicingProvider (stub paths)
        ↓
SdI                  apply_sdi_event (sole intended writer of fiscal_validity)
```

**SSOT principles verified:**

- Numbering: one engine (`document_number_sequences`), no client EXECUTE
- VAT on emit: DB RPC, snapshot on rows post-emit
- XML: deterministic builder + golden tests + offline XSD
- Emission snapshot: immutable post-emit (`invoice_snapshot`)

**Gaps:**

- `fiscal_validity` not trigger-guarded (P0)
- Wizard client-side totals preview vs DB authoritative (P1 drift risk)
- Legacy SQL migrations still contain MAX+1 (superseded by F6 deploy, not removed from history)

---

## FASE Matrix

| FASE | Component | Stato | Dipendenze | Rischi | GAP |
|------|-----------|-------|------------|--------|-----|
| 1 | Gap analysis legacy fatturazione | PASS (doc) | pre-202701 migrations | Legacy paths if F6 not deployed | Inventario only |
| 2 | Fiscal specification | **DRAFT** | F1 | Rules not commercially signed | Governance UNKNOWN |
| 3 | Accounting engine | PASS (code) | — | Live DB tests optional | Auto-post from invoice disabled by design |
| 4 | Fiscal periods | PASS (code) | F3 | Period lock bypass tested | — |
| 5 | Admin master data | PASS (code) | F3–4 | billing_customers migration order | Deploy prerequisite |
| 6 | Document numbering | PASS (code+tests) | F5 | F8 redefines same RPC | Verify F6/F8 function parity |
| 7 | VAT engine | PASS (code+tests) | F5–6 | Client preview drift | ordini-fornitori still uses iva_percent |
| 8 | Ciclo attivo | PASS (code) | F5–7 | Emit TX not live-tested | Migrations pending deploy |
| 9 | Invoice / SDI state | PASS (code) | F8 | apply_sdi_event over-exposed | fiscal_validity bypass P0 |
| 10 | XML FatturaPA | PASS (tests) | F9 | Bollo DB field pending | FPA12 CIG/CUP partial |
| 11 | Aruba live | **NOT STARTED** | F10 + security fixes | Placeholder URLs | Contract UNKNOWN |

---

## Findings Summary

### P0 — BLOCKER

| ID | Finding | Evidenza |
|----|---------|----------|
| P0-SEC-01 | Direct UPDATE `fiscal_validity`, `accounting_status` on `invoices` | Axis guard covers 3 columns only (`20260910150500`); no trigger on fiscal axes |
| P0-DEP-01 | FASE 3–10 migrations pending production deploy | All FASE status reports: "pending deploy" |

### P1 — CRITICAL

| ID | Finding | Evidenza |
|----|---------|----------|
| P1-SEC-01 | `apply_sdi_event` granted to `authenticated`; guard allows fatturazione write | `20270310120100` L494–495 |
| P1-SEC-02 | Invoice DEFINER RPCs lack `company_id` check | Multi-tenant IDOR if enabled |
| P1-SEC-03 | `invoice_insert_event` accepts caller `p_actor_id` | Audit impersonation |
| P1-BLD-01 | TypeScript gate FAIL (10 errors) | `npm run ci:tsc` |
| P1-DRIFT-01 | Client wizard totals via `calculateInvoiceTotals()` | DB authoritative on emit only |
| P1-OPS-01 | Aruba WS paths placeholder | `aruba-provider.server.ts` ponytail comment |

### P2 — HIGH

| ID | Finding |
|----|---------|
| P2-SEC-01 | Draft header totals not trigger-protected |
| P2-SEC-02 | Client INSERT on `invoice_fatturapa_snapshots` |
| P2-SEC-03 | Webhook accepts service_role Bearer |
| P2-GOV-01 | FASE 2 spec DRAFT vs implemented engine |
| P2-LEG-01 | Legacy MAX+1 in pre-F6 migration files (historical) |
| P2-CON-01 | No conservazione sostitutiva — storage ≠ archiving |

### P3 — MEDIUM

| ID | Finding |
|----|---------|
| P3-01 | Simulator fallback if Aruba env unset in cron |
| P3-02 | Webhook idempotency weak without `notification_id` |
| P3-03 | Bollo: canonical `StampDutyData` without DB persistence rule |
| P3-04 | `in_riconciliazione` UI filter partial |

### P4 — LOW

| ID | Finding |
|----|---------|
| P4-01 | Manifest duplicate RPC signatures |
| P4-02 | `invoice-canonical.ts` deprecated shim |
| P4-03 | `invoice-status.ts` legacy axis fallback |

### UNKNOWN

| ID | Topic |
|----|-------|
| UNK-01 | Commercialista sign-off on FASE 2 fiscal rules |
| UNK-02 | Aruba exact API contract (paths, auth, polling) |
| UNK-03 | Bollo automatic determination for all CAB casistiche |
| UNK-04 | Conservazione elettronica a norma — provider/responsabilità |
| UNK-05 | TD02/TD03 acconto — business need not confirmed |

---

## Remediation Applied (SAFE_FIX)

See `CAB_PRE_ARUBA_CHANGELOG.md`:

- Updated `fatturazione-production-readiness.test.ts` to reference FASE 6 numbering test (removed legacy file)
- Fixed false-positive in `security-migration-gate` for UnoERP migration comment

**Not auto-fixed (requires decision / migration):**

- P0 fiscal_validity trigger
- P1 apply_sdi_event privilege restriction
- P1 TypeScript errors
- P0 deploy verification

---

## Gate Decision

| Criterion | Result |
|-----------|--------|
| P0 count | 2 |
| P1 count | 6 |
| Fiscal UNKNOWN blocking supported docs | 1 (bollo partial) |
| test:fase10 | PASS |
| Fiscal invariant gates | PASS |
| security-migration-gate | PASS (after comment fix) |
| ci:tsc | **FAIL** |

**GATE: BLOCKED**

---

## Residual Risks

Full list: `CAB_REMAINING_RISKS.md`  
Aruba integration plan: `CAB_ARUBA_READINESS.md`

---

## Conclusion

> **NOT ARUBA API READY**

CAB internal model (canonical invoice → XML → transmission job → adapter) is architecturally sound and tested for supported document types (TD01, TD04, TD05, TD24, TD25). Aruba must remain a transmission provider, not a fiscal corrector — but **security SSOT gaps and undeployed migrations block production gate**. Resolve P0-SEC-01, restrict SDI RPCs, deploy FASE 3–10 chain, fix typecheck, then re-run gate.
