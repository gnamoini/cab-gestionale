# Gate A — discovery (non produzione)

Data: 2026-09-03. **WRITE TESTS EXECUTED = 0**

## PREVENTIVO

**Esito: BLOCKED**

| Criterio | Esito |
|----------|-------|
| module/file identificato | FAIL — `Produzione/preventivi` non leggibile |
| schema testata | NOT VERIFIED |
| schema righe | NOT VERIFIED |
| customer reference | PASS_CONDITIONED — `anagrafica_id` su ordini (ordini ≠ preventivi) |
| item/service mapping | PASS_CONDITIONED — articoli schema |
| IVA | PASS |
| correlation strategy | BLOCKED |
| struttura sufficiente per CREATE/UPDATE | FAIL |

## DDT

**Esito: PASS_CONDITIONED**

| Criterio | Esito |
|----------|-------|
| module/file | PASS — `Magazzino/movimento` |
| struttura testata | PARTIALLY_VERIFIED |
| righe | NOT VERIFIED |
| customer reference | PASS_CONDITIONED — `anagrafica_id` |
| item/service | PASS_CONDITIONED |
| IVA | PASS |
| sezionale | PASS — `sezionale` + Amministrazione/sezionali |
| anno/serie/numero | PARTIALLY_VERIFIED |
| numerazione | PASS_CONDITIONED — **condition: SAFE_WRITE_TEST** |
| correlation | BLOCKED |

Condizione: `SAFE_WRITE_TEST` per numerazione; permesso READ clienti consigliato.

## CONSUNTIVO

**Esito: BLOCKED**

| Criterio | Esito |
|----------|-------|
| modulo/representation | FAIL |
| mapping | FAIL |
| struttura | NOT VERIFIED |
| utilità workflow amministrativo | FAIL |

---

## Prossimi passi (non eseguiti automaticamente)

1. Escalation permessi API: READ `Base/clienti`, `Produzione/preventivi`, `Magazzino/movimento` con dati
2. Campo correlation ufficiale UnoERP
3. Gate B: safe write test numerazione DDT (solo ambiente controllato)
4. **Non** abilitare worker WRITE in produzione fino a Gate A preventivo + correlation risolti
