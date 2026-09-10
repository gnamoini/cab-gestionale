# CAB VAT Migration Report (FASE 7)

**Date:** 2026-09-10  
**Status:** Template — execute against live DB before production cutover

## Mapping rules

| Legacy signal | Target | Confidence | Action |
|---------------|--------|------------|--------|
| `iva_percent = 22` + sales + date ≥ 1900 | `IVA22` sales config | HIGH | Auto-map `vat_code_id` |
| `iva_percent = 10` | `IVA10` | MEDIUM | Map if single config on date |
| `iva_percent = 4` | `IVA4` | MEDIUM | Map if single config on date |
| `iva_percent = 0` without nature | — | **BLOCKED** | Manual review |
| NC header `/1.22` only | Row-based NC | HIGH | Rebuilt by FASE7 RPC |
| Preventivo bridge | `default_vat_code_id` suggest | MEDIUM | User validates on invoice |

## Backfill steps

1. Run seed: `vat_seed_company_defaults(company_id)`
2. For consolidated invoices (`emessa`+): map `iva_percent` → `vat_code_id` where HIGH confidence
3. Run `vat_consolidate_invoice_rows(invoice_id)` only where mapping HIGH and totals unchanged
4. BLOCKED rows → export CSV for commercialista review

## Ambiguity log

| invoice_id | row_id | legacy | reason | status |
|------------|--------|--------|--------|--------|
| — | — | — | No production data at audit time | N/A |

## Post-cutover

- Remove `iva_percent` default from DB (future migration after validation window)
- Delete legacy `/1.22` paths — **done in FASE7 SQL**
