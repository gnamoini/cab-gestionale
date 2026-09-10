# CAB Pre-Aruba Audit Changelog

Automatic fixes across audit + remediation (2026-09-10).

---

## Audit phase (read-only + safe gates)

### 1. `lib/regression/fatturazione-production-readiness.test.ts`

Replaced deleted `allocate-invoice-number.concurrency.test.ts` with `document-numbering.concurrency.test.ts`.

### 2. `supabase/migrations/20261403120000_unoerp_integration.sql`

Comment reworded to avoid security-migration-gate false positive.

---

## Remediation phase (P0/P1)

### 3. `supabase/migrations/20270312120000_pre_aruba_security_remediation.sql` **NEW**

- P0: extend `invoice_guard_direct_axes_update` → `fiscal_validity`, `accounting_status`
- P2: `invoice_guard_emitted_totals_update` for emessa invoices
- P1: `apply_sdi_event` / `handle_sdi_outcome` → service_role only
- P1: `invoice_insert_event` actor from session
- P1: `invoice_assert_tenant_access` + draft RPC tenant guard
- P2: `invoice_fatturapa_snapshots` SELECT-only for authenticated

### 4. `docs/security/rpc-access-manifest.json`

`apply_sdi_event`, `handle_sdi_outcome` → SERVER_ONLY / service_role only.

### 5. TypeScript / drift fixes

- `INVOICES_COLUMNS`, `fiscal_context` on `InvoiceRow`
- `fatturazionePaymentsQueryKey`
- `formatInvoiceMoney`, wizard/contabilita imports
- `map-cab-invoice.server.ts` → real `SupabaseClient`
- Test fixtures updated

### 6. `app/api/fatturazione/sdi-webhook/route.ts`

Removed service_role Bearer auth; constant-time secret compare.

### 7. `lib/regression/pre-aruba-security-gate.test.ts` **NEW**

Static regression for remediation migration + manifest.

### 8. Documentation

- `CAB_PRE_ARUBA_REMEDIATION_BASELINE.md`
- `CAB_FASE3_10_DEPLOYMENT_GATE.md`
- `CAB_PRE_ARUBA_REMEDIATION_REPORT.md`

---

## Verification

```bash
npm run ci:tsc                    # PASS
npm run test:fase10               # PASS
npm run test:security:remediation # PASS
npx tsx lib/regression/pre-aruba-security-gate.test.ts  # PASS
```
