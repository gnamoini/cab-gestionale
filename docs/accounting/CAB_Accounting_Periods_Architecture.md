# CAB Accounting — FASE 4 Periods Architecture

**Date:** 2026-09-10

---

## Layer model

| Layer | Responsibility |
|-------|----------------|
| DB triggers | Immutability, SSOT flags, period status direct-write block |
| RPC SECURITY DEFINER | Single-writer: entries, periods, audit |
| RLS | Company isolation, SELECT-only on sensitive tables |
| App (`lib/accounting/*`) | Thin RPC wrappers, no period FK in payloads |
| UI | Reflect server state; disable unavailable actions |

---

## Tables

### `accounting_fiscal_years`

Annual exercise. Status: `OPEN | CLOSED`. Audit: `opened_at/by`, `closed_at/by`.

Constraints: `UNIQUE(company_id, year)`, EXCLUDE no-overlap per company, max 1 OPEN per company.

### `accounting_periods`

12 monthly periods per fiscal year. Status: `OPEN | CLOSED | LOCKED`.

FK: `fiscal_year_id`. EXCLUDE no-overlap per fiscal year. Trigger: contained in fiscal year dates.

### `accounting_entries`

FK: `fiscal_year_id`, `period_id` — **NOT NULL** (including draft).

`entry_kind`: `normal | reversal | adjustment`.

Links: `reverses_entry_id`, `corrects_entry_id`.

### `accounting_audit_events`

Append-only. Events: `FISCAL_YEAR_OPENED`, `FISCAL_YEAR_CLOSED`, `PERIOD_CLOSED`, `PERIOD_LOCKED`, `PERIOD_REOPENED`, `ENTRY_POSTED`, `ENTRY_REVERSED`, `ENTRY_ADJUSTED`.

---

## RPC catalog

| RPC | Permission |
|-----|------------|
| `accounting_resolve_period` | read |
| `accounting_create_entry` | write |
| `accounting_update_entry` | write |
| `accounting_post_entry` | post |
| `accounting_reverse_entry` | reverse |
| `accounting_create_adjustment_entry` | adjust |
| `accounting_open_fiscal_year` | fiscal_year_open |
| `accounting_close_fiscal_year` | fiscal_year_close |
| `accounting_close_accounting_period` | period_close |
| `accounting_lock_accounting_period` | period_lock |
| `accounting_reopen_accounting_period` | period_reopen |
| `accounting_list_fiscal_periods` | read |

---

## SSOT flags

| Flag | Scope |
|------|-------|
| `accounting.write_ssot` | Entry/line mutations |
| `accounting.period_ssot` | Period/fiscal year status transitions |
| `accounting.audit_ssot` | Audit event inserts |

---

## Invariants

1. `competence_date` resolves exactly one fiscal year + one monthly period
2. Posting requires fiscal year OPEN + period OPEN
3. Posted entries immutable (except status→reversed link)
4. Reversal/adjustment in OPEN period of explicit date
5. No admin blanket bypass in `accounting_rbac_can`
6. No direct client write on periods, fiscal years, audit
