# CAB Accounting — Entry Lifecycle (SSOT)

## States

| State | Description |
|-------|-------------|
| `draft` | Editable; no `entry_number`; not immutably registered |
| `posted` | Registered; `entry_number` assigned; lines immutable |
| `reversed` | Original entry reversed; linked to reversal entry |
| `cancelled` | Draft abandoned; no accounting effect |

## Transition Matrix

| State | edit | post | cancel | reverse |
|-------|------|------|--------|---------|
| `draft` | yes | yes | yes | no |
| `posted` | no | no | no | yes |
| `reversed` | no | no | no | no |
| `cancelled` | no | no | no | no |

## Flows

```text
DRAFT ──post──► POSTED ──reverse──► POSTED (reversal entry) + original → REVERSED
DRAFT ──cancel──► CANCELLED
```

## Rules

- **`entry_number`**: assigned only in `accounting_post_entry`, never in create/update draft
- **Reversal**: creates new entry with `entry_origin = reversed`, `reverses_entry_id` → original; original gets `reversed_by_entry_id` and `status = reversed`
- **No hard delete** on entries or lines
- **No direct UPDATE** on posted/reversed/cancelled entries or their lines

## Identity vs Numbering

| Concept | Field | Usage |
|---------|-------|-------|
| Technical identity | `accounting_entries.id` (UUID) | PK, FK, API, idempotency |
| Human numbering | `journal_id + fiscal_year + entry_number` | Display, reports, export |

Never use `entry_number` alone as a technical identifier.
