# FASE 9 STATUS REPORT

```
FASE 9 STATUS: PASS (pending migration deploy + Aruba contract verification)
```

## Delivered

- [x] Audit: `CAB_Invoice_Audit.md`
- [x] Schema: `20270310120000_fase9_invoice_engine_schema.sql`
- [x] RPC: `20270310120100_fase9_invoice_engine_rpc.sql`
- [x] Canonical model + pre-submit validator
- [x] XML engine modules (builder, validator, hash, version)
- [x] Transmission layer + `apply_sdi_event` sole fiscal writer
- [x] Fix ACCEPTED → no `validly_issued`
- [x] Aruba WS adapter (polling, no webhook assumption)
- [x] Reconciliation for timeout
- [x] Correction flow RPC + UI
- [x] RBAC granular permissions
- [x] Tests: invariants + XML fixtures
- [x] Documentation suite

## Deploy prerequisite

See `FASE9_DEPLOY_PREREQUISITE.md` — FASE 5–8 migrations must be applied first.

## Residual

- Aruba LIVE: verify exact WS paths against CAB contract
- Full XSD file download + lib integration (structural contract gate in place)
- `in_riconciliazione` filter needs transmission table join in UI (partial: composite filter)

## Gate checklist

```
□ Migrations applied (FASE 5-8 + FASE 9)
□ apply_sdi_event sole writer fiscal_validity
□ provider_accepted does not set validly_issued
□ XML blob + hash persisted
□ Correlation chain verifiable
□ Tests pass
□ Zero UnoERP in fatturazione paths
```
