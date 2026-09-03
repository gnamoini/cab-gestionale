# Customer mapping

**Stato: PARTIALLY_VERIFIED** — anagrafica clienti non leggibile; riferimenti documento verificati.

## Modulo anagrafica clienti

| Campo | Valore |
|-------|--------|
| UNOERP_MODULE | `Base` |
| UNOERP_FILE | `clienti` |
| PRIMARY_KEY | **UNKNOWN** — `info` → HTTP 500 |
| Stato | **OBSERVED blocked** (non distinguibile da modulo assente) |

## Riferimento cliente nei documenti (OBSERVED)

| Documento | Module/File | Campo | Formato |
|-----------|-------------|-------|---------|
| Ordini | Produzione/ordini | `anagrafica_id` | livesearch |
| Task/commessa | Produzione/task | `cliente_id` | livesearch |
| Movimento/DDT | Magazzino/movimento | `anagrafica_id` | (in schema; formato non in fieldset header) |
| Movimento/DDT | Magazzino/movimento | `clifor_id` | ID destinatario |

**CUSTOMER_REFERENCE_FIELD (documenti):** `anagrafica_id` / `cliente_id` (ID interno UnoERP via livesearch)

## Campi anagrafica (NOT VERIFIED — modulo clienti non leggibile)

| Campo CAB | UnoERP | Stato |
|-----------|--------|-------|
| customer code | ? | NOT VERIFIED |
| ragione sociale | ? | NOT VERIFIED |
| partita IVA | ? | NOT VERIFIED |
| codice fiscale | ? | NOT VERIFIED |
| indirizzo / CAP / comune / provincia | ? | NOT VERIFIED |
| PEC / SDI | ? | NOT VERIFIED |
| pagamento / banca | `mod_pagamento` su documenti | OBSERVED su ordini/movimento |

## VAT / tax code fields

| Campo | Stato |
|-------|-------|
| VAT_FIELD | NOT VERIFIED (serve `Base/clienti`) |
| TAX_CODE_FIELD | NOT VERIFIED |

## Destinazioni

- `destinazione_id` su **Produzione/ordini** (menu)
- `destinatario_mov`, `indirizzo`, `citta`, `provincia` su **Magazzino/movimento**
- Login API: `destinazioni: false` per utente corrente

**DESTINATION_STRUCTURE:** destinazione separata su ordini (`destinazione_id`); su movimento campi testo indirizzo.

## Strategia CAB (invariata)

1. `unoerp_customer_mappings` (authority)
2. P.IVA esatta
3. CF esatto
4. codice cliente UnoERP se stabile
5. Nessuna CREATE anagrafica

**Blocco:** senza READ su `Base/clienti` la verifica P.IVA/CF via API è **NOT TESTED** — richiede permesso READ o mapping manuale iniziale.
