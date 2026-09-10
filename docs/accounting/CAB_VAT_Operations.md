# CAB VAT Operations

## Architecture

```text
vat_codes (identity) → vat_code_configurations (version + direction)
→ vat_resolve_configuration → vat_calculate_line → vat_consolidate_invoice_rows (emit)
→ vat_movements (on accounting_post_entry)
```

## Admin operations

| Operation | RPC | Notes |
|-----------|-----|-------|
| Create code + config | `vat_admin_create_code` | Idempotent seed for std codes |
| New version | `vat_admin_create_configuration_version` | Closes prior with `valid_to` |
| List for UI | `vat_list_codes_for_context` | Filter by date + direction |

**Rule:** Used configuration → new temporal version only.

## Document workflow

1. Draft: rows carry `vat_code_id` (server validates via `vat_process_draft_row`)
2. Emit: `vat_validate_document` → `vat_consolidate_invoice_rows` → snapshot immutable
3. NC: row-based with `parent_invoice_row_id`; no `/1.22`

## default_vat_code_id

Suggested commercial default on partner anagrafica. Server always re-resolves; may reject expired/incompatible codes.

## EsigibilitaIVA

Resolved by `resolveEsigibilitaIva(config, document.fiscal_context)` — not stored on VAT code alone.

## Rounding

SSOT: `lib/vat/vat-rounding.ts` — tolerance 0.01 EUR.

## Troubleshooting

| Error | Cause |
|-------|-------|
| `VAT_CODE_MISSING` | Row without `vat_code_id` |
| `VAT_CODE_EXPIRED` | No config for date/direction |
| `VAT_AMOUNT_MISMATCH` | Client totals ≠ engine |
| `VAT_NATURE_REQUIRED` | ESENTE/N6.x without nature |
