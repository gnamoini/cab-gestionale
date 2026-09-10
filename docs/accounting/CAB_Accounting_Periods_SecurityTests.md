# CAB Accounting — FASE 4 Security & Bypass Tests

**Date:** 2026-09-10  
**Status:** Static gates PASS; live DB tests require `supabase start`

---

## Bypass attempts (must all FAIL)

| # | Attack vector | Expected result | Enforcement layer |
|---|---------------|-----------------|-------------------|
| 1 | `UPDATE accounting_entries` posted row | DENY | `accounting_guard_write_ssot` + REVOKE |
| 2 | `DELETE accounting_entries` posted row | DENY | Same |
| 3 | `INSERT accounting_entries` without SSOT | DENY | Trigger |
| 4 | `UPDATE accounting_periods SET status='OPEN'` | DENY | `accounting_guard_period_status_direct` + REVOKE |
| 5 | `UPDATE accounting_fiscal_years SET status` | DENY | Same |
| 6 | `INSERT accounting_audit_events` | DENY | `accounting_guard_audit_immutable` + REVOKE |
| 7 | Client passes `fiscal_year_id` in create payload | IGNORED | RPC resolves server-side |
| 8 | Client passes `period_id` in create payload | IGNORED | RPC resolves server-side |
| 9 | `accounting_reverse_entry` without `p_reversal_date` | DENY | RPC raises |
| 10 | Admin role without `contabilita.period_close` | DENY | `accounting_rbac_can` (no blanket admin) |
| 11 | `close_fiscal_year` with OPEN period | DENY | RPC precheck |
| 12 | `reopen` LOCKED period | DENY | RPC precheck |
| 13 | `lock` from OPEN (skip CLOSED) | DENY | RPC precheck |
| 14 | Direct `SECURITY DEFINER` audit insert | DENY | REVOKE on `accounting_insert_audit_event` |

---

## Invariant tests (35 scenarios)

Catalogued in [`lib/accounting/accounting-periods.integration.test.ts`](../../lib/accounting/accounting-periods.integration.test.ts).

Run static gates:

```bash
node lib/accounting/accounting-invariants.test.ts
node lib/regression/accounting-period-guard.test.ts
node lib/accounting/accounting-periods-bypass.test.ts
node lib/accounting/accounting-periods.integration.test.ts
```

---

## Concurrency scenarios (live DB)

| Scenario | Expected |
|----------|----------|
| Two users close same period | One succeeds, one gets lock/conflict error |
| Post while close in flight | Deterministic: period OPEN check in post or close wins via `FOR UPDATE` |
| Double reverse same entry | Second fails: "already reversed" |
| Double lock same period | Second fails: not CLOSED |

---

## Results (static CI)

| Gate | Result |
|------|--------|
| accounting-invariants.test.ts | PASS |
| accounting-period-guard.test.ts | PASS |
| accounting-periods-bypass.test.ts | PASS |
| accounting-periods.integration.test.ts | PASS |
