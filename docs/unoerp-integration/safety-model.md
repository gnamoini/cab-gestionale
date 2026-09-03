# Safety model

## Vietato

- `act=delete`, `deleteRecord`, cancel/disable/archive/status destruttivi verso UnoERP
- UPDATE senza `unoerp_document_links` coerente
- CREATE dopo timeout senza lookup correlation key
- Auto-CREATE se record mappato missing
- Riassociazione automatica cliente/articolo/servizio già mappati
- Match di contenuto come ownership
- Sync implicita / reconciliation che scrive

## Ownership UPDATE

Consentito solo se link esiste e:

`cab_document_id + cab_document_type + unoerp_module + unoerp_file + unoerp_record_id` coincidono con il job.

## Circuit breaker

`UNOERP_SYNC_HARD_STOP=1` ferma i write. Non è un feature flag di prodotto con percorsi paralleli.
