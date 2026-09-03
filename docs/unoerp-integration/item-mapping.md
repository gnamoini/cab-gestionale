# Item mapping

**Stato: VERIFIED (schema)** — campioni articolo non disponibili in index.

| Campo | Valore |
|-------|--------|
| UNOERP_MODULE | `Magazzino` |
| UNOERP_FILE | `articoli` |
| PRIMARY_KEY | `id_articoli` |

## Campi (OBSERVED `info`)

| Concetto | Campo | Formato |
|----------|-------|---------|
| Codice articolo | `alpha_cod` | text (SKU) |
| Descrizione | `descrizione` | text |
| Tipo | `tipo` | menu (`M` merci, `S` servizi, `I` imballo, `V` vuoto a rendere — da doc UnoERP) |
| IVA acquisti | `cod_iva_id` | menu → `Base/iva` |
| IVA vendite | `cod_iva_vendita_id` | menu |
| Unità misura | `unita_misura_id` | menu → `Base/unita_misura` |
| Famiglia | `famiglia_id` | gerarchic |
| Listino | collegamento via `Magazzino/listini` | |

## Riferimento nelle righe documento

**NOT VERIFIED** — schema righe ordini/movimento non letto.

Presunto: ID articolo interno (`id_articoli`) nelle righe tab materiali.

## Matching CAB → UnoERP

| Strategia | Stato |
|-----------|-------|
| `unoerp_item_mappings` (authority) | previsto |
| codice articolo esatto (`alpha_cod`) | PASS_CONDITIONED (campo verificato in schema) |
| descrizione fuzzy | **VIETATO** |

## Listini

`Magazzino/listini` — PK `id_listino` (OBSERVED). Prezzi articolo probabilmente per listino — dettaglio NOT VERIFIED.
