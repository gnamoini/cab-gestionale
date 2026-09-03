# Service / manodopera mapping

**Stato: PARTIALLY_VERIFIED**

## Servizi come articoli

UnoERP non espone modulo `servizi` separato leggibile (`Magazzino/servizi` → HTTP 500).

**OBSERVED:** `Magazzino/articoli.tipo` = menu con tipologia merce/servizio (documentazione pubblica + campo `tipo` in schema).

| Concetto | Mapping |
|----------|---------|
| Servizio CAB | articolo UnoERP con `tipo` = servizio |
| PK | `id_articoli` |
| Codice | `alpha_cod` |

## Manodopera / prestazioni

| Area | Module/File | Evidenza |
|------|-------------|----------|
| Tab manodopera ordini | Produzione/ordini → `risorse_umane` | tab fieldset OBSERVED |
| Modulo attività | Produzione/attivita | HTTP 500 — NOT READABLE |
| Ore | Produzione/ore | HTTP 500 |

**Manodopera:** struttura righe **NOT VERIFIED**. Probabile tab `risorse_umane` su ordini/task — richiede READ ordine/attività con dati.

## IVA servizi

Usare `cod_iva_vendita_id` su articolo servizio → `Base/iva.id_iva`.

## Tax setup

Nessun modulo tax dedicato trovato oltre `Base/iva`.

## Regola

NON creare servizi/manodopera su UnoERP. Mapping solo su articoli esistenti.
