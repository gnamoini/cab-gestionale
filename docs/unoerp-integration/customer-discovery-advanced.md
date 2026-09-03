# Customer discovery advanced

## Modulo diretto

- `Base/clienti`: info=500, classification=UNKNOWN_500
- **CUSTOMER_MODULE_IDENTIFIED:** Base/clienti (inferred from livesearch field names)
- **CUSTOMER_DATA_NOT_READABLE:** YES (HTTP 500 su info/index/show)

## Riferimenti indiretti (OBSERVED)

- `Produzione/ordini.anagrafica_id` → Base/clienti (inferred from field name) (format=livesearch; field name suggests customer; extra=default_val)
- `Produzione/task.cliente_id` → Base/clienti (inferred from field name) (format=livesearch; field name suggests customer; extra=default_val)

## Campi anagrafica

| Campo | Stato |
|-------|-------|
| PK | NOT_VERIFIED |
| P.IVA | NOT_VERIFIED |
| CF | NOT_VERIFIED |
| codice cliente | NOT_VERIFIED |

**Classificazione blocker:** REQUIRES_VENDOR_SUPPORT (permessi READ clienti) — non SELF_SOLVABLE_READ_ONLY finché Base/clienti resta 500 senza body diagnostico univoco