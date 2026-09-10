# CAB Numbering — Architecture

## Scope

Centralized fiscal numbering for:

- `fattura` (FT)
- `nota_credito` (NC)
- `ddt` (DDT)

**Out of scope:** preventivi/consuntivi (operational JSONB numbering), accounting journal sequences (`accounting_journal_sequences`), proforma (until explicit feature).

## SSOT stack

```text
UI action
  → authorized document RPC (SECURITY DEFINER + RBAC)
    → PERFORM allocate_document_number()  [same transaction]
    → UPDATE document row
  → UNIQUE constraint on document table
```

## Data model

Table: `document_number_sequences`

Key: `(company_id, document_type, fiscal_year, series)`

- `series`: canonical `DEFAULT` = no sezionale (never NULL)
- `current_number`: last allocated progressive

## Concurrency

1. `INSERT … ON CONFLICT DO NOTHING` — single sequence row per key
2. `SELECT … FOR UPDATE` — serialize increments
3. `UPDATE current_number = current_number + 1 RETURNING` — atomic bump

## Transaction model

| Document | Allocation moment | Rollback gaps |
|----------|-------------------|---------------|
| Fattura | `emit` | Accepted |
| NC | `create_credit_note_from_invoice` (emessa at create) | Accepted |
| DDT | `confirm_ddt` | Accepted |

## Security

- `allocate_document_number`: **no EXECUTE grants** (internal only)
- `document_number_sequences`: RLS enabled, no client policies
- Client direct allocation: **impossible**

## Display

Derived via `format_document_number()` (SQL) and `lib/document-numbering/format-document-number.ts` (TS). Never authoritative for allocation.

## Legacy removed (FASE 6)

- `invoice_number_sequences`
- `allocate_invoice_number()`
- `ddt_numero_counters`
- `assign_ddt_numero()`
- `MAX(numero)+1` on invoices
