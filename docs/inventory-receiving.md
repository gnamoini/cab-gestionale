# Inventory Receiving (ricezione merce da DDT)

Dominio `lib/inventory-receiving/` — carico ricambi da DDT con estrazione AI, review e apply RPC.

## Flusso

1. Upload DDT (`import_files` kind `ddt_receiving`)
2. `POST /api/magazzino/receiving/analyze` — Gemini + matching
3. Review split-view (`/magazzino/carichi/nuovo?documentId=…` — resume only; nuovo carico via modal AI)
4. `POST .../confirm-review` + `POST .../apply` — RPC `inventory_receiving_apply`

## Stati documento

`UPLOADED` → `ANALYZING` → `REVIEW_REQUIRED` → `READY_TO_APPLY` → `APPLIED` | `PARTIALLY_APPLIED` | `FAILED`

## Permessi

- Page: `magazzino_carichi`
- Module RLS: `magazzino_carichi.read` / `magazzino_carichi.write`

## Tabelle

- `inventory_documents` — header DDT + `document_ai_confidence`, `purchase_order_id` (futuro)
- `inventory_document_lines` — `extracted_quantity` / `received_quantity`
- `inventory_item_matches` — storico decisioni matching
- `movimenti_ricambi.inventory_document_id` — tracciabilità carico

## API

| Route | Metodo |
|-------|--------|
| `/api/magazzino/receiving` | GET lista |
| `/api/magazzino/receiving/pending` | GET sessioni in sospeso |
| `/api/import-files/upload-policy` | POST upload SSOT |
| `/api/magazzino/receiving/analyze` | POST |
| `/api/magazzino/receiving/[id]` | GET |
| `/api/magazzino/receiving/[id]/file-url` | GET anteprima PDF |
| `/api/magazzino/receiving/[id]/confirm-review` | POST |
| `/api/magazzino/receiving/[id]/apply` | POST |

## v2 backlog

- `inventory_supplier_codes` (tabella indicizzata)
- Wire `purchase_order_id` → ordini fornitori
- Altri `document_type` (fatture, bolle, resi)
