# CAB Accounting — Architecture

## Layer Model

```text
DB (CHECKS + CONSTRAINTS + deferred triggers)
  ↓
RPC ONLY (SECURITY DEFINER, SET LOCAL write_ssot)
  ↓
SERVER (lib/accounting/accounting-engine.server.ts)
  ↓
UI (read-only lists / future forms)
```

## Module Structure

| Layer | Tables |
|-------|--------|
| Configuration | `accounting_accounts`, `accounting_journals`, `accounting_causes`, periods, VAT codes, payment terms |
| Core | `accounting_entries`, `accounting_entry_lines` |
| Derived | `vat_movements`, `receivables`, `payables`, `bank_transactions`, `fixed_asset_movements` |

## Identity vs Numbering

- **`accounting_entries.id`** (UUID): immutable technical identity for API, FK, idempotency
- **`journal_id + fiscal_year + entry_number`**: human-readable accounting number assigned **only at post**

## Balance Integrity

Transactional accumulator `accounting_entry_balance_pending` + deferred constraint trigger ensures `SUM(debit) = SUM(credit)` at COMMIT for multi-row operations.

## Security

- Module: `contabilita` (+ transition fallback via `fatturazione`)
- `company_id` on all tables; RLS isolation
- Direct INSERT/UPDATE/DELETE revoked on movement tables for `authenticated`

## Extension Points (future phases)

- Invoice emit → `accounting_create_entry` with `(source_type, source_id)` idempotency
- VAT liquidation on `vat_periods`
- Bank import → `bank_transactions` → manual post to entries
