# Production Readiness — Fatturazione ERP

Checklist obbligatoria prima del deploy in produzione (staging tutta verde).

## Write path e SSOT

- [ ] `npx tsx lib/regression/fatturazione-status-write-audit.test.ts` verde
- [ ] `npx tsx lib/regression/fatturazione-db-write-graph.test.ts` verde (solo `invoice_write_status_axes` aggiorna assi)
- [ ] Nessun bypass TS su `invoices.status` / assi

## Backfill e legacy

- [ ] Backup DB prima di `apply_invoice_status_backfill()`
- [ ] `SELECT * FROM invoice_status_migration_report()` revisionato e archiviato
- [ ] Snapshot A: `SELECT * FROM invoice_status_backfill_snapshot()`
- [ ] `SELECT apply_invoice_status_backfill()`
- [ ] Snapshot B: diff conteggi business atteso (totale, pagate, scadute, annullate, bozze)
- [ ] `SELECT count(*) FROM invoice_legacy_status_audit_report()` → **0**

## Recovery test (staging)

1. Backup completo DB
2. Apply migrations su clone
3. **Restore completo** del backup su ambiente test
4. Re-apply migrations
5. Verify: quadratura + legacy audit + smoke login `/fatturazione`

## Concorrenza e locking

- [ ] Test numerazione (`allocate-invoice-number.concurrency.test.ts`)
- [ ] Optimistic locking: transizione con `expected_version` obsoleta → errore / messaggio conflitto

## Quadratura

- [ ] `invoice_payment_reconciliation_report()` senza mismatch
- [ ] `customer_balance_reconciliation_report()` coerente per campione clienti

## Eventi e timeline

- [ ] Catena `correlation_id` + `causation_id` su pagamenti
- [ ] Timeline paginata a cursor; `created_at` immutabile
- [ ] Nessun evento duplicato su operazioni idempotenti

## Performance

- [ ] Checklist [`fatturazione-performance-checklist.md`](fatturazione-performance-checklist.md) compilata
- [ ] Artefatti EXPLAIN in `docs/perf/` aggiornati

## Contabilità

- [ ] `entry_origin` presente su `accounting_entries`
- [ ] Generazione contabile automatica **disabilitata** in prod

## CI

- [ ] `npx tsx lib/regression/fatturazione-production-readiness.test.ts` verde
- [ ] `npm run build` verde
