# Fatturazione — status migration map (Fase 0)

Inventario `invoices.status` legacy prima della migrazione a 3 assi (`document_status`, `payment_status`, `sdi_status`).

## Status WRITE locations

| File | Meccanismo | Note |
|------|------------|------|
| `supabase/migrations/20260716130000_fatturazione_module.sql` | `create_invoice_with_rows_and_links` | Imposta `status` in INSERT |
| `supabase/migrations/20260717150000_invoices_update_draft_rpc.sql` | `update_invoice_draft_with_rows` | Aggiorna bozze |
| `supabase/migrations/20260716130000_fatturazione_module.sql` | `register_invoice_payment` | `invoice_recalculate_status` → `status` |
| `supabase/migrations/20260910140100_cancel_invoice_write_permission.sql` | `cancel_invoice` | `status = annullata` |
| `src/services/invoices.service.ts` | `updateDraft` | `.update(patch)` può includere `status` |
| `src/services/invoices.service.ts` | `issue` | `.update({ status })` diretto |
| `components/fatturazione/fatturazione-wizard-modal.tsx` | `create` / `updateDraftWithRows` | `statusOut` nel payload RPC |

## Status READ locations

| File | Uso |
|------|-----|
| `components/fatturazione/fatturazione-view.tsx` | Filtri KPI, badge tabella, sort colonna stato |
| `components/fatturazione/fatturazione-detail-drawer.tsx` | Azioni condizionate (bozza, emessa, pagata, annullata) |
| `components/fatturazione/fattura-status-badge.tsx` | Display badge |
| `components/fatturazione/fatturazione-advanced-filter-panel.tsx` | Filtro stato |
| `lib/fatturazione/fatturazione-advanced-filters.ts` | `invoiceMatchesAdvancedFilters` |
| `lib/fatturazione/fatturazione-list-ui-filters.ts` | Search haystack, sort |
| `lib/fatturazione/invoice-calculations.ts` | `buildInvoiceKpi`, `resolvePaymentStatus` |
| `lib/fatturazione/fatturazione-csv-export.ts` | Export etichetta stato |
| `lib/report/report-domain-analytics.ts` | KPI economici periodo |
| `src/services/invoices.service.ts` | `invoiceIsDeletable`, guard bozze |

## RPC coinvolti

- `create_invoice_with_rows_and_links`
- `update_invoice_draft_with_rows`
- `register_invoice_payment` → `invoice_recalculate_status`
- `cancel_invoice`
- `invoice_recalculate_status` (helper)

## Ordine migrazione (post Fase 1A migration)

1. Deploy migration schema + `invoice_status_migration_report()`
2. Eseguire report dry-run su staging; revisione anomalie
3. `apply_invoice_status_backfill()`
4. Migrare write path app → `invoice_apply_transition()` (RPC)
5. Migrare read path UI → helper `lib/fatturazione/invoice-status.ts` (display legacy `status` fino a Fase 1B completa)
6. Regression: grep anti-pattern `.update({ status:` su `invoices`

## Test baseline

- `e2e/smoke/17-fatturazione.spec.ts` — pagina raggiungibile
- `lib/fatturazione/fatturazione-invoice-calculations.test.ts` — calcoli KPI
- `lib/regression/fatturazione-production-readiness.test.ts` — gate CI

## SSOT post-validazione (V1)

| Dominio | API unica | Enforcement |
|---------|-----------|-------------|
| Assi stato | `invoice_write_status_axes()` | Guard DB + `fatturazione-db-write-graph.test.ts` |
| Eventi | `invoice_insert_event()` / `appendBillingEvent()` | Revoca INSERT RLS + grep TS |
| Transizioni | `invoice_apply_transition(expected_version)` | Optimistic lock → `invoice_version_conflict` |

Allowlist migration-only: `apply_invoice_status_backfill` (ponytail).

Write graph generato: [`fatturazione-db-write-graph.md`](fatturazione-db-write-graph.md).
