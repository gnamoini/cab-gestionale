# Stock Pipeline — Magazzino

## Invariant S-01

```
magazzino_ricambi.quantita == proiezione(ledger movimenti_ricambi)
```

`quantita` è **materializzata** per performance, non editabile direttamente.

**Eccezione:** giacenza iniziale su `CREATE` ricambio senza movimento → `coherent: null` fino al primo movimento o rettifica inventario.

## Modello

```
INSERT movimento
      ↓
Stock Engine (RPC stock_apply_movement — transazione atomica)
      ↓
UPDATE magazzino_ricambi.quantita + stock_version
```

## OCC

```sql
UPDATE magazzino_ricambi
SET quantita = :new_q, stock_version = stock_version + 1
WHERE id = :id AND stock_version = :expected_version;
```

0 righe → **409 Conflict**. Mai last-write-wins.

## operation_id

Identificatore end-to-end: client → API → movimento → audit → realtime → cache merge.

## Client SSOT

`Stock Entity Cache` (`lib/magazzino/stock-entity-cache.ts`) — unica sorgente client per `quantita` + `stock_version` + `lastOperationId`.

## Write paths (target)

| Path | Meccanismo |
|------|------------|
| +/- scorta UI | `POST /api/magazzino/stock/adjust` |
| Edit modal delta | Stock Engine API |
| Lavorazione scarico | Stock Engine (fase successiva) |
| DDT receiving | `inventory_receiving_apply` (allineamento) |
| Import | Stock Engine rettifica |
| Nuovo ricambio qty iniziale | movimento `giacenza_iniziale` o eccezione S-01 |

## Verifica integrità

`lib/magazzino/verify-stock-integrity.ts` — diagnostica drift ledger vs materializzata (CI).
