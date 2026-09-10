# FASE 7 VAT ENGINE — Review Gate

**Date:** 2026-09-10

| Area | Status | Notes |
|------|--------|-------|
| AUDIT | PASS | `CAB_VAT_Audit.md`, `CAB_VAT_Model.md`, `CAB_VAT_Compatibility.md` |
| MODEL | PASS | Schema + overlap direction + snapshot v1 |
| MIGRATION | PASS | Report template; SQL cutover without feature flag |
| ACCOUNTING INTEGRATION | PASS | `vat_sync_movements_from_invoice` on post |
| DOCUMENT INTEGRATION | PASS | Invoice create/update/emit/NC via VAT engine |
| E-INVOICE COMPATIBILITY | PASS | Pre-flight RPC + adapter fields |
| SECURITY | PASS | RLS + RPC manifest + admin RBAC |
| TESTS | PASS | `vat-invariants`, `vat-engine-gate`, invoice calc |
| REGRESSION | PASS | Static gates for hardcoded 22 removal |
| RELEASE GATE | PENDING | Requires CI run on branch |

## Definition of Done checklist

- [x] Nessun `default_vat_code_id` come verità fiscale definitiva (server validates)
- [x] `direction` + validity in resolution
- [x] `vat_natures` vs `vat_operation_types` separated
- [x] EsigibilitaIVA explicit resolution path
- [x] NC multi-aliquota row model
- [x] Snapshot reconstruction fields + JSONB
- [x] Config vs calculation modules separated
- [x] No rate-only fiscal inference
- [x] Overlap EXCLUDE includes direction
- [x] Business logic 22% removed from fatturazione path
- [x] No permanent feature flag

## FINAL STATUS

**RELEASE_READY** pending commercialista seed sign-off on production deploy and CI green.
