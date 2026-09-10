# CAB Accounting — Database Model

## company_id Rule

**Every** accounting/fiscal table has `company_id uuid NOT NULL REFERENCES companies(id)`.

RLS: `company_id = rbac_user_company_id()`.

## Configuration Tables

### accounting_account_groups

`id`, `company_id`, `code`, `description`, `parent_id`, `active`, audit columns.  
UNIQUE `(company_id, code)`.

### accounting_accounts

`id`, `company_id`, `code`, `description`, `account_type`, `nature`, `group_id`, `parent_id`, `level`, `active`, `valid_from`, `valid_to`, audit.  
UNIQUE `(company_id, code)`.

### accounting_journals

`id`, `company_id`, `code`, `description`, `journal_type`, `active`, audit.  
UNIQUE `(company_id, code)`.

### accounting_causes

`id`, `company_id`, `code`, `description`, `cause_type`, `default_journal_id`, `active`, audit.  
UNIQUE `(company_id, code)`.

### accounting_journal_sequences

`journal_id`, `fiscal_year`, `last_number`, `company_id`.  
PK `(journal_id, fiscal_year)`.

### accounting_fiscal_years

`id`, `company_id`, `year`, `start_date`, `end_date`, `status` (`OPEN`|`CLOSED`), audit (`opened_at/by`, `closed_at/by`).  
UNIQUE `(company_id, year)`. EXCLUDE no-overlap per company. Max 1 OPEN per company.

### accounting_periods (monthly, 12 per fiscal year)

`id`, `fiscal_year_id`, `company_id`, `period_number` (1–12), `name`, `start_date`, `end_date`,  
`status` (`OPEN`|`CLOSED`|`LOCKED`), audit + `lock_reason`.  
UNIQUE `(fiscal_year_id, period_number)`.

## Core Tables (evolved)

### accounting_entries

| Column | Notes |
|--------|-------|
| `id` | UUID PK — technical identity |
| `company_id` | NOT NULL |
| `journal_id`, `cause_id` | FK config |
| `fiscal_year_id`, `period_id` | FK NOT NULL — resolved server-side from `competence_date` |
| `entry_kind` | normal, reversal, adjustment |
| `corrects_entry_id` | FK self — corrective entry |
| `entry_number` | NULL in draft; set at post |
| `fiscal_year` | Set at post |
| `competence_date`, `registration_date` | Business dates |
| `entry_date` | Legacy; kept for compat |
| `status` | draft, posted, cancelled, reversed |
| `entry_origin` | manual, automatic, imported, reversed |
| `reverses_entry_id`, `reversed_by_entry_id` | Self-FK audit |
| `idempotency_key` | Partial unique per company |
| `source_type`, `source_id`, `invoice_id` | Origin refs |

UNIQUE `(company_id, journal_id, fiscal_year, entry_number) WHERE entry_number IS NOT NULL`.

### accounting_entry_lines

| Column | Notes |
|--------|-------|
| `entry_id` | FK RESTRICT |
| `account_id` | FK accounting_accounts |
| `line_number` | int |
| `account_code` | Legacy / working |
| `account_code_snapshot` | Set at post |
| `debit`, `credit` | numeric(14,2); XOR CHECK |

## Balance Mechanism

1. `accounting_entry_balance_pending(entry_id, backend_xid)` — UNLOGGED accumulator
2. Row trigger on lines: `INSERT pending ON CONFLICT DO NOTHING`
3. Deferred constraint trigger: `accounting_assert_pending_entries_balanced()`
4. Validates SUM(debit)=SUM(credit), min 2 lines, blocks line changes on non-draft entries

## Derived Tables

See migrations `20270110120200`–`20270110120500` for VAT, payments, bank, fixed assets schemas.

## Single-Writer

`SET LOCAL accounting.write_ssot = true` inside SECURITY DEFINER RPC only.  
Triggers reject writes without local flag. REVOKE direct table mutations from `authenticated`.
