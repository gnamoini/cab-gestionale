# CAB Accounting — Invariants

## Double Entry

1. `SUM(debit) = SUM(credit)` per entry (deferred trigger)
2. Each line: debit XOR credit, both ≥ 0, not both zero
3. Minimum 2 lines per balanced entry

## Lifecycle

See [CAB_Accounting_Lifecycle.md](./CAB_Accounting_Lifecycle.md).

## Numbering

- Draft: `entry_number IS NULL`
- Post: atomic sequence increment per `(journal_id, fiscal_year)`
- UNIQUE `(company_id, journal_id, fiscal_year, entry_number)` where not null

## Periods (FASE 4)

- 12 monthly periods per fiscal year (mandatory)
- `competence_date` → `accounting_resolve_period()` → `fiscal_year_id` + `period_id` (NOT NULL on all entries)
- No ordinary posting when fiscal year `CLOSED` or period `CLOSED`/`LOCKED`
- Storno/rettifica in OPEN period of explicit `p_reversal_date` / `adjustment_date`
- `close_fiscal_year` fails if any period still `OPEN`
- CLOSED vs LOCKED: same entry block; LOCKED not reopenable

## Receivables / Payables

- `SUM(amount) per entry_line_id ≤ line.debit + line.credit`
- FK to posted entry required for creation (via RPC in future)

## VAT Historicity

- `vat_movements` stores `vat_code_snapshot`, `vat_rate_snapshot`, `vat_nature_snapshot`
- Changes to `vat_codes` do not alter posted movements

## Test Mapping

| # | Invariant | Test |
|---|-----------|------|
| 1–5 | Balance / XOR / negatives | `accounting-invariants.test.ts` (static) + DB integration |
| 6 | Closed period | `accounting-period-guard.test.ts` |
| 7–8 | Numbering unique / concurrent | `accounting-numbering.concurrency.test.ts` |
| 9–10 | Immutability / reverse | migration SQL gates |
| 11 | Transactional rollback | deferred trigger design |
| 12 | RLS | RBAC migration revoke |
| 13 | VAT snapshot | VAT migration columns |
| 14 | Receivable quota | payment migration trigger |
| 15–16 | Lifecycle / SET LOCAL | RPC migration gates |
