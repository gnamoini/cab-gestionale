# Preventivo mapping

**Stato: BLOCKED** — modulo preventivi nativo non leggibile con utente API corrente.

## Modulo preventivo nativo

| Campo | Valore |
|-------|--------|
| UNOERP_MODULE | `Produzione` (ipotesi da HTTP 500) |
| UNOERP_FILE | `preventivi` / `preventivo` |
| Evidenza | `info` → **HTTP 500** (OBSERVED) — non `404` |
| PRIMARY_KEY | NOT VERIFIED |

**Non usare** `Produzione/ordini` come sostituto automatico del preventivo CAB.

## Modulo correlato leggibile: Produzione/ordini

| Campo | Valore |
|-------|--------|
| UNOERP_MODULE | `Produzione` |
| UNOERP_FILE | `ordini` |
| PRIMARY_KEY | `id` |
| Evidenza | `info` PASS |

### Testata (schema OBSERVED)

| Concetto | Campo UnoERP | Formato |
|----------|--------------|---------|
| ID | `id` | |
| Cliente | `anagrafica_id` | livesearch |
| Oggetto | `oggetto` | text |
| Destinazione | `destinazione_id` | menu |
| Task/commessa | `task_id` | task |
| Data | `data` | data |
| Scadenza | `data_scadenza` | data |
| Note | `note` | textarea |
| Integrazione esterna | `note_integrazioni` | textarea |
| Pagamento | `mod_pagamento` | menu |
| Protocollo | `prot_id` | hidden |

### Righe (OBSERVED — struttura tab)

| Tab fieldset | Contenuto probabile |
|--------------|---------------------|
| `materiali` | tab righe materiali |
| `risorse_umane` | tab manodopera |
| `risorse_tecniche` | tab risorse tecniche |
| `subappalti` | subappalti |
| `canoni` | canoni |
| `riepilogo` | totali |

**Struttura righe:** sub-record / tab (non tabella piatta) — dettaglio righe **NOT VERIFIED** (`show` su ordine non disponibile: index vuoto).

### Articolo / servizio / manodopera

- Materiali → probabile riferimento `Magazzino/articoli` (`id_articoli`, `alpha_cod`, `tipo` M/S)
- Manodopera → tab `risorse_umane` (schema righe NOT VERIFIED)

## Gap

- Numero preventivo, validità, stato preventivo: **NOT VERIFIED**
- `index`/`show` su ordini: nessun record nel campione API
- Mapping CAB preventivo → UnoERP: **REQUIRES_VENDOR_CONFIRMATION** (permessi READ preventivi + conferma modulo)
