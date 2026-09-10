# CAB Accounting — API (RPC)

SSOT: `supabase/migrations/20270110120100_accounting_engine_rpc.sql` + `20270111120100_accounting_period_rpc_fase4.sql`  
TypeScript: `lib/accounting/accounting-engine.server.ts`, `lib/accounting/accounting-periods.server.ts`

## Entry RPC

| RPC | RBAC | Description |
|-----|------|-------------|
| `accounting_create_entry(p_payload)` | write | Create draft; resolves `fiscal_year_id` + `period_id` from `competence_date` |
| `accounting_update_entry(p_payload)` | write | Update draft; re-resolves period on date change |
| `accounting_get_entry(p_entry_id)` | read | Entry header + lines |
| `accounting_list_entries(p_filters)` | read | Paginated list |
| `accounting_post_entry(p_entry_id, p_idempotency_key)` | post | Assign number, snapshot, status → posted |
| `accounting_cancel_entry(p_entry_id, p_reason)` | cancel | Draft → cancelled |
| `accounting_reverse_entry(p_entry_id, p_reversal_date, p_reason, p_idempotency_key)` | reverse | Storno in OPEN period of `p_reversal_date` |
| `accounting_create_adjustment_entry(p_payload)` | adjust | Corrective entry after reversal |

## Period / fiscal year RPC

| RPC | RBAC | Description |
|-----|------|-------------|
| `accounting_resolve_period(p_company_id, p_accounting_date)` | read | SSOT date → fiscal year + monthly period |
| `accounting_list_fiscal_periods()` | read | Fiscal years with nested 12 periods |
| `accounting_open_fiscal_year(p_year, p_start_date, p_end_date)` | fiscal_year_open | Creates year + 12 monthly periods |
| `accounting_close_fiscal_year(p_fiscal_year_id)` | fiscal_year_close | Requires all periods CLOSED/LOCKED |
| `accounting_close_accounting_period(p_period_id, p_reason)` | period_close | OPEN → CLOSED |
| `accounting_lock_accounting_period(p_period_id, p_reason)` | period_lock | CLOSED → LOCKED |
| `accounting_reopen_accounting_period(p_period_id, p_reason)` | period_reopen | CLOSED → OPEN (not LOCKED) |

## Payload: create/update

```json
{
  "journal_id": "uuid",
  "cause_id": "uuid?",
  "competence_date": "2026-09-10",
  "registration_date": "2026-09-10",
  "description": "string",
  "lines": [
    { "account_code": "1100", "debit": 100, "credit": 0 },
    { "account_code": "4100", "debit": 0, "credit": 100 }
  ]
}
```

**Note:** `fiscal_year_id` and `period_id` are **not** accepted from client — server resolves via `competence_date`.

## Payload: adjustment

```json
{
  "corrects_entry_id": "uuid",
  "adjustment_date": "2026-10-15",
  "journal_id": "uuid?",
  "description": "Rettifica",
  "reason": "string?",
  "lines": [ ... ]
}
```

## Errors

| Code | Meaning |
|------|---------|
| `42501` | Permission denied / direct write blocked |
| `23506` | Immutability violation |
| Exception text | Unbalanced entry, closed period, ambiguous date resolve |

## Idempotency

`accounting_post_entry` and `accounting_reverse_entry` accept idempotency key. Unique per `(company_id, idempotency_key)`.
