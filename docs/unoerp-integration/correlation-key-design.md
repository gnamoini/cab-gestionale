# Correlation key design

**Stato: BLOCKED** per DDT e preventivo; **PASS_CONDITIONED** solo per ordini.

## Campi candidati (OBSERVED)

| Module/File | Campo | Tipo | Idoneità |
|-------------|-------|------|----------|
| Produzione/ordini | `note_integrazioni` | textarea — "Specifiche da integrazione esterna" | PASS_CONDITIONED (solo ordini) |
| Magazzino/movimento | `vsrif` | Rif. ordine | NO — riferimento business, non CAB |
| Magazzino/movimento | — | nessun `source_*` | BLOCKED |
| Produzione/preventivi | — | modulo non leggibile | NOT VERIFIED |
| Base/clienti | — | modulo non leggibile | NOT VERIFIED |

## Classificazione

| Documento CAB | Caso | Stato |
|---------------|------|-------|
| preventivo | C | **BLOCKED** — nessun campo dedicato verificato |
| consuntivo | — | **BLOCKED** (modulo assente) |
| DDT | C | **BLOCKED** — nessun campo tecnico affidabile su `movimento` |

## Strategia CAB prevista (non implementabile senza campo)

Formato: `CAB|entity|UUID`

**Non usare:** cliente + data + totale + descrizione.

## Azione richiesta

```
BLOCKED — richiedere soluzione ufficiale UnoERP
```

Opzioni vendor:

1. Campo custom su `Magazzino/movimento` e `Produzione/preventivi`
2. Uso documentato di `note_integrazioni` con contratto di formato (solo ordini)
3. Tabella correlazione solo lato CAB (già prevista) senza write-back campo UnoERP

Fino a risoluzione: sync CREATE/UPDATE resta **BLOCKED** per idempotenza su timeout.
