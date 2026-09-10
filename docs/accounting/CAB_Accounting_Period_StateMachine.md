# CAB Accounting — Period State Machines

**Date:** 2026-09-10

---

## Fiscal year

```text
OPEN
  |
  +---- CLOSED
```

| From | To | RPC | Precondition |
|------|-----|-----|--------------|
| — | OPEN | `accounting_open_fiscal_year` | No overlap; creates 12 periods |
| OPEN | CLOSED | `accounting_close_fiscal_year` | All 12 periods CLOSED or LOCKED |

No `LOCKED` state on fiscal year.

---

## Accounting period (monthly)

```text
OPEN
  |
  +---- CLOSED
          |
          +---- LOCKED (terminal)
          |
          +---- OPEN (reopen only, authorized)
```

| From | To | RPC | Notes |
|------|-----|-----|-------|
| — | OPEN | `accounting_open_fiscal_year` | Created with fiscal year |
| OPEN | CLOSED | `accounting_close_accounting_period` | Fiscal year must be OPEN |
| CLOSED | LOCKED | `accounting_lock_accounting_period` | Reason required; no reopen |
| CLOSED | OPEN | `accounting_reopen_accounting_period` | Fiscal year OPEN; not from LOCKED |

**Forbidden:** `OPEN → LOCKED` direct.

---

## Entry lifecycle (period context)

| Entry status | Period OPEN | Period CLOSED/LOCKED |
|--------------|-------------|---------------------|
| draft | Edit allowed | Create/edit blocked |
| posted | Immutable | Immutable |
| reversed | Immutable | Immutable |

Corrections: `reverse` + `adjustment` in OPEN period of explicit date.
