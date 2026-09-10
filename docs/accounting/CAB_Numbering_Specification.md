# CAB Numbering — Specification

## Sequence key

```text
company_id + document_type + fiscal_year + normalize_document_series(series)
```

### `normalize_document_series`

- `trim` → `uppercase`
- empty/null → `DEFAULT`
- allowed: `[A-Z0-9_-]{1,16}`

## Document types (FASE 6)

| Type | Allowed in allocator |
|------|---------------------|
| fattura | yes |
| nota_credito | yes |
| ddt | yes |
| proforma | no (future, non-fiscal) |

## Display formats (padding 3)

| Type | Example |
|------|---------|
| fattura | `FT 2026/001` |
| nota_credito | `NC 2026/001` |
| ddt (series A) | `DDT A/2026/001` |
| ddt (DEFAULT) | `DDT 2026/001` |

Draft invoices / DDT bozza: UI `"Bozza"` (`numero IS NULL`).

## Fattura lifecycle

1. `create_invoice_with_rows_and_links` → `numero NULL`, `series DEFAULT` (or payload)
2. `invoice_apply_transition('emit')` → allocates FT, sets `numero`, open item `document_number` formatted

Initial status `emessa`/`inviata` at create: **rejected** — use emit transition.

## Nota di credito

**No draft NC** in current domain.

`create_credit_note_from_invoice`:

- validates source invoice is emitted (`numero NOT NULL`)
- allocates NC in same transaction
- inserts with `document_status = emessa`

Future draft NC would follow fattura model (NULL until emit).

## DDT

- `create_ddt_with_rows` → `numero NULL`, normalized `serie`
- `confirm_ddt` → allocates DDT progressive

## Unique constraints

### invoices

```sql
UNIQUE (company_id, document_type, anno, series, numero)
WHERE numero IS NOT NULL AND document_status <> 'annullata'
```

Allows simultaneous:

```text
(fattura, 2026, DEFAULT, 1)
(nota_credito, 2026, DEFAULT, 1)
```

## Immutability

After emission/confirm: `numero`, `anno`, `series`/`serie`, `document_type` cannot change (DB triggers).

## Invariants (INV-1..INV-9)

See `lib/document-numbering/document-numbering-invariants.test.ts` and `lib/regression/document-numbering-gate.test.ts`.

## Audit

Pre-migration: `scripts/ops/fase6-numbering-pre-migration-audit.sql`

Baseline gate: zero invoices/NC → no FT/NC data migration; DDT seed conditional.
