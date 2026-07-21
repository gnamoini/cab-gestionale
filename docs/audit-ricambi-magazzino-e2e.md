# Audit Ricambi/Magazzino E2E (FleetCare/CAB)

Data: 2026-07-21  
Piano: v4 CONGELATO — implementazione completata.

## A. Report audit

### SSOT quantità (R-12)
- **Runtime SSOT:** `magazzino_ricambi.quantita`
- **Ledger:** `movimenti_ricambi` append-only
- Regola consumer documentata in [`lib/magazzino/stock-ssot.ts`](lib/magazzino/stock-ssot.ts)
- Eccezioni documentate: import Excel (qty diretta), create iniziale senza movimento

### Integrità stock
| ID | Stato | Implementazione |
|---|---|---|
| R-13 | Fix | Conditional update `gte(quantita)` su decremento |
| R-22 | Fix | Colonna `operation_id` + idempotenza in `movimentiService.create` |
| R-18 | Fix | `remove`/`update` stock bloccati; `storno()` operativo |
| R-19/R-24 | Fix | `buildStockMovementAuditPayload` + `StockMovementOrigin` |
| R-23 | Fix | `scripts/verify-stock-integrity.ts` |

### RBAC (R-01, R-04)
- Migration [`20261021120200_magazzino_stock_integrity.sql`](supabase/migrations/20261021120200_magazzino_stock_integrity.sql): expansion `magazzino→magazzino_carichi`, RLS `app_settings` per `master`/`stock_policy`
- `settingsEntry.upsertMagazzinoSetting` + `useMagazzinoSettingsUpsertMutation`
- Append liste `magazzino:*` con permesso `magazzino` write

### Propagazione (R-02, R-20)
- Scorta sync → `invalidateAfterMagazzinoOrMovimenti` (report + health-score query stale)

### Import (R-03, R-17)
- `magazzinoAdmin: perm.canWrite`
- Log per-riga `IMPORT_UPDATE` su overwrite

### Scheda operativa (R-21, R-25, R-14, R-15, R-05–R-07)
- Card stato operativo con policy configurabile `app_settings.magazzino.stock_policy`
- Quick actions: Carica/Scarica, Lavorazioni, Ordini, QR (label actions)
- Sezione movimenti tabellare (`RicambioMovimentiSection`)
- Ordini fornitore collegati per `ricambio_id` (`RicambioOrdiniSection`)
- Etichette Carico/Scarico vs Rettifica su stepper e azioni scorta (R-06)

### Polish (R-09, R-11)
- Edit ricambio: telemetria + messaggio save con segnaposto lenient (come nuovo ricambio)
- Log locale scorta deduplicato vs movimento server nel feed (`isLocalMagazzinoLogDuplicate`)

### QR lifecycle
- Revoke token su `magazzinoService.remove`

### Ruoli
- `operatore` = write magazzino completo (seed)
- Ruolo dedicato "responsabile magazzino" **non esiste** — documentato

## B. Matrice funzionale (seed default)

| Funzione | Admin | Direttore | Tecnico | Amm. | Esito post-fix |
|---|---|---|---|---|---|
| Visualizza ricambi | write | write | write | none | OK |
| CRUD ricambio | write | write | write | none | OK |
| Movimenti | write | write | write | none | OK |
| Master lists | write | write | write | none | OK (R-01) |
| Import overwrite | write | write | write | none | OK (R-03) |
| Carichi DDT | write | write | write | none | OK |

## C. Test regression

```bash
npx tsx lib/regression/magazzino-stock-audit-payload.test.ts
npx tsx lib/regression/magazzino-migration-safety.test.ts
npx tsx lib/regression/magazzino-permission-bypass.test.ts
npx tsx lib/regression/magazzino-scorta-invalidation.test.ts
npx tsx lib/regression/magazzino-movements-append-only.test.ts
npx tsx lib/regression/ricambio-scheda-quick-actions.test.ts
npx tsx lib/regression/magazzino-health-score-invalidation.test.ts
npm run verify-stock-integrity
```

## D. Checklist finale

- [x] SSOT: no SUM(movimenti) per giacenza UI
- [x] operation_id idempotenza
- [x] Append-only (storno, no delete utente)
- [x] Audit payload + StockMovementOrigin enum
- [x] verify-stock-integrity CLI
- [x] Health Score stale su movimento
- [x] Scheda R-21 + policy R-25
- [x] Migration regression test
- [x] Permission bypass wiring
