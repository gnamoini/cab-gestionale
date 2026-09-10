# CAB VAT Engine — Audit (FASE 0)

**Date:** 2026-09-10  
**Status:** PASS (read-only inventory complete)  
**Scope:** Pre-implementation audit for FASE 7 VAT Engine

## 1. Executive summary

The Gestionale CAB has **FASE 3 VAT scaffolding** (`vat_codes`, `vat_registries`, `vat_movements`) but **no operational VAT engine**. All fiscal document calculations use **`iva_percent` with a hardcoded 22% default**. Credit notes use a flat **`/1.22` split**. No FatturaPA natura codes (N2.x, N3.x, N4, N6.x) exist in application logic.

## 2. Code inventory — IVA business logic

### 2.1 Fatturazione (primary fiscal path)

| File | Role | Hardcoding |
|------|------|------------|
| `lib/fatturazione/invoice-calculations.ts` | SSOT row/document totals | `iva_percent ?? 22` |
| `src/services/invoices.service.ts` | Payload cleanup | `iva_percent ?? 22` |
| `components/fatturazione/fatturazione-wizard-modal.tsx` | New row default | `iva_percent: 22` |
| `lib/fatturazione/preventivo-to-invoice-draft.ts` | Bridge | All rows `iva_percent: 22` |
| `lib/fatturazione/ddt-to-invoice-draft.ts` | Bridge | All rows `iva_percent: 22` |
| `lib/fatturazione/fe-sdi/fatturapa-snapshot.ts` | XML stub | Passes `iva_percent` only |
| SQL RPCs (fatturazione migrations) | Persisted calc | `coalesce(iva_percent, 22)` |
| `supabase/migrations/20270210120000_fase6_document_numbering_engine.sql` | NC creation | `amount / 1.22` |

### 2.2 Ordini fornitori (secondary — purchase direction)

| File | Role |
|------|------|
| `lib/ordini-fornitori/ordine-fornitore-totals.ts` | Per-row IVA from `ivaPercent ?? 22` |
| `lib/ordini-fornitori/ordine-fornitore-riga-meta.ts` | `readRigaIvaPercent(..., fallback=22)` |
| SQL `ordine_fornitore_compute_totals` | Header fallback 22% |

### 2.3 Preventivi (commercial — display only)

| File | Role |
|------|------|
| `lib/pdf/preventivo-pdf-layout.ts` | `PDF_PREVENTIVO_IVA_PERCENT = 22` |
| `components/preventivi/preventivi-editor-modal.tsx` | UI preview at 22% |

No per-line IVA in DB; `totaleFinale` is commercial net+gross overlay.

### 2.4 Fiscal identity (NOT rate logic)

`lib/fiscal/` — P.IVA, CF, IBAN, PEC, codice destinatario normalization/validation only.

### 2.5 Hardcoded rate classification

| Pattern | Count context | Classification |
|---------|---------------|----------------|
| `?? 22`, `default 22`, `coalesce(..., 22)` | ~40+ occurrences | **Business logic — REMOVE** |
| `/ 1.22` | NC RPC + phase1b | **Business logic — REMOVE** |
| `10`, `4` aliquote | Test fixtures only | OK in tests |
| `PDF_PREVENTIVO_IVA_PERCENT = 22` | Preventivo PDF | **Display overlay — decouple from VAT engine** |

## 3. Database inventory

### 3.1 VAT tables (FASE 3)

| Table | Status | Gap |
|-------|--------|-----|
| `vat_codes` | Empty scaffold | `UNIQUE(company_id, code)` blocks temporal versioning; rate/nature on identity row |
| `vat_registries` | Empty scaffold | No `direction`, no temporal validity |
| `vat_periods` | Scaffold | Links to legacy `fiscal_periods` |
| `vat_movements` | Schema only | Never populated from invoices |

### 3.2 Document IVA columns

| Table | Columns | Snapshot |
|-------|---------|----------|
| `invoices` | `imponibile`, `iva`, `totale` | `customer_snapshot` only |
| `invoice_rows` | `iva_percent`, `imponibile`, `iva`, `totale` | **None** |
| `invoice_links` | `allocated_imponibile`, `allocated_iva` | N/A |
| `ordini_fornitori` | Header `iva_percent` + meta per riga | `fornitore_snapshot` |
| `preventivi` | `totale`, `dettagli` JSONB | No IVA |
| `ddt_documents` | No amounts | Snapshots for customer/mezzo only |

### 3.3 Master data references

- `clienti_anagrafiche.default_vat_code_id` → `vat_codes` (unused in calculations)
- `clienti_anagrafiche.natura_iva_default` — text, no UI
- `fornitori_anagrafiche.default_vat_code_id` — same

### 3.4 Accounting integration

- `accounting_entries.invoice_id` FK exists; auto-post **disabled**
- `vat_movements` designed for snapshot at posting — **not wired**
- Period guards: FASE 4 `accounting_periods` OPEN/CLOSED/LOCKED

### 3.5 Duplicate / parallel structures

| Structure | Issue |
|-----------|-------|
| `iva_percent` on rows vs `vat_codes.rate` | Two SSOT — consolidate to VAT engine |
| `natura_iva_default` text vs future `vat_natures` | Parallel — migrate to FK |
| `registry_type` text on vat_codes vs `vat_registries` | Inconsistent — use FK |

## 4. Document flow map

```
Preventivo (no IVA DB) ──22% overlay──► PDF/display
         │
         └── preventivo-to-invoice-draft ──► invoice_rows.iva_percent=22

DDT (qty only) ──► ddt-to-invoice-draft ──► prezzo=0, iva_percent=22

Wizard ──► emptyRow().iva_percent=22 ──► calculateInvoiceTotals ──► RPC

NC ──► create_credit_note_from_invoice ──► header /1.22 split (no rows)

vat_codes (DB) ──X──► (not connected)
```

## 5. Gaps vs FASE 7 target

| ID | Gap | Priority |
|----|-----|----------|
| GAP-VAT-001 | No VAT resolution engine | P0 |
| GAP-VAT-002 | 22% hardcoded everywhere | P0 |
| GAP-VAT-003 | No temporal versioning on VAT config | P0 |
| GAP-VAT-004 | No document VAT snapshot | P0 |
| GAP-VAT-005 | NC flat /1.22, no row detail | P0 |
| GAP-VAT-006 | No vat_natures / operation_types tables | P0 |
| GAP-VAT-007 | vat_movements never populated | P1 |
| GAP-VAT-008 | No EsigibilitaIVA resolution model | P1 |
| GAP-VAT-009 | default_vat_code_id unused | P1 |
| GAP-VAT-010 | Fatture passive / ND not implemented | P2 (BLOCKED) |

## 6. Legacy data assessment

- `invoice_rows.iva_percent`: values expected 22 (possibly 0 on DDT-import rows)
- No `vat_code_id` on any document row
- Consolidated invoices (`emessa`+): amounts computed with rate at save time — backfill requires mapping report
- Ambiguous rows (rate-only, no nature): classify as **MEDIUM/BLOCKED** in migration report

## 7. Security baseline

- VAT config tables: RLS via `accounting_rbac_can('admin')` (FASE 3 pattern)
- `vat_movements`: REVOKE direct writes from authenticated
- No VAT RPCs in manifest today — FASE 7 must add entries

## 8. Audit conclusion

**AUDIT: PASS** — sufficient inventory to proceed with FASE 7 implementation. No blocking unknowns on schema or document flows. Commercialista sign-off on seed matrix remains **PENDING** (ref. `CAB_Accounting_Fiscal_Specification.md` DRAFT).
