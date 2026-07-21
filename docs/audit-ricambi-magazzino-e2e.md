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
- [x] operation_id idempotenza (path UI/lavorazione/scorta/storno)
- [x] Append-only (storno, no delete utente)
- [x] Audit payload + StockMovementOrigin enum
- [x] verify-stock-integrity CLI
- [x] Health Score stale su movimento (client query invalidation)
- [x] Scheda R-21 + policy R-25
- [x] Migration regression test
- [x] Permission bypass wiring
- [x] Migration `20261021120200` applicata su production (2026-07-21)

---

## E. Production Hardening — verifiche post-v4 (2026-07-21)

### Gate audit

| Scope | Esito | Note |
|---|---|---|
| **Dominio Ricambi/Magazzino** | **PASS** | Stock layer, RBAC, propagazione client, scheda, regression dedicate |
| **Governance globale (`control:local`)** | **BLOCKED** | Failure pre-esistenti: build budget, design, report v2 — fuori scope Ricambi |

```text
Audit Ricambi Gate:
  Functional domain:  PASS
  Global governance:  BLOCKED BY PRE-EXISTING FAILURES
```

### 1. R-18 append-only

| Controllo | Esito |
|---|---|
| `movimentiService.remove` / `movimentiEntry.remove` | **Bloccato** — entry ritorna errore esplicito |
| `movimentiService.update` su stock | **Bloccato** — messaggio "Modifica movimento contabilizzato non consentita" |
| `storno()` operativo | **Presente** — nuovo movimento inverso |
| UI delete movimento | **Assente** — nessun bottone operativo |
| RLS `cap_movimenti_delete` | **Esiste a DB** — solo bypass diretto API/SQL; nessun path FE |

**Debito:** storno esposto solo via service/entry, **non ancora in UI scheda** (nessun bottone per manager/admin).

### 2. `operation_id` end-to-end

| Path | operation_id | origine audit |
|---|---|---|
| Stepper scorta (`scorta-adjust-sync`) | ✅ UUID stabile per burst/retry | `manual_adjustment` |
| Scarico lavorazione (`apply-scarico-da-scheda`) | ✅ `crypto.randomUUID()` | `lavorazione` |
| Storno (`movimentiService.storno`) | ✅ opzionale, generabile | `storno` |
| **DDT / carichi RPC** (`apply_inventory_receiving` in migration) | ❌ **No** — insert parallelo senza colonna | meta/audit non standard |
| **Import Excel overwrite** | ❌ **No** — eccezione R-12: qty diretta + log IMPORT_UPDATE | `import` in audit log, non movimento |

**Debito hardening:** allineare RPC DDT al modello canonico (`operation_id` + `meta.origine: "ddt"`) in migration dedicata — path parallelo documentato, non unificato.

### 3. Health Score — stale vs rigenerazione

| Layer | Comportamento | Esito |
|---|---|---|
| Client post-scorta | `invalidateAfterMagazzinoOrMovimenti` → `qc.invalidateQueries(["dashboard","health-score"])` | ✅ stale, no sync recompute |
| Server cache | `invalidateHealthScoreOnDomainEvent("magazzino.movement")` | ⚠️ **Mappato ma zero caller** — invalidazione server-side solo su altri eventi |

**Rischio:** cache in-memory server HS può restare stale fino a TTL/prossimo evento non-magazzino. Accettabile se snapshot engine legge sempre dopo invalidazione client; da collegare in hardening se si usa HS server-only.

### 4. Stock integrity checker (R-23)

| Stato output | Significato attuale |
|---|---|
| `coerente: SI` | drift = 0 |
| `movimenti: 0 — coerenza: N/D` | nessun ledger (import/legacy) |
| `DRIFT: ±N` | drift ≠ 0 |

**Debito:** nessuna severità esplicita OK/WARNING/CRITICAL né exit code ≠ 0 su drift critico. CLI oggi è diagnostica demo-safe.

### 5. Scheda operativa

| Controllo | Esito |
|---|---|
| Quick action permission-aware | ✅ `canAdjustScorta` / `magCanCreateRicambio` disabilitano + tooltip |
| Storno per ruolo | ❌ **Non in UI** — tutti i ruoli write vedono solo Carica/Scarica |
| Copertura consumo = 0 | ✅ `formatCoverageLabel` → `—` (non Infinity); stato operativo → `normale` se sopra minimo |
| Ordini collegati | ✅ tabella read-only; catena Ordine → DDT → Carico → Movimento invariata |

### 6. QR lifecycle

| Controllo | Esito |
|---|---|
| Revoke token su delete ricambio | ✅ `magazzinoService.remove` → `inventory_qr_tokens.status = revoked` |
| Route `/r/[token]` token orfano | ⚠️ da smoke manuale — revoke implementato, errore UX non verificato in browser |

### 7. R-16 — ADR ruolo magazzino (decisione documentata)

**Decisione:** non introdurre ruolo "responsabile magazzino" senza richiesta prodotto.

**Stato attuale:** seed RBAC assegna `magazzino: write` a admin, direttore, tecnico. Addetto amministrativo: `none`.

**Upgrade path:** quando il cliente scala, separare `magazzino.read` / `magazzino.adjust` / `magazzino.master` / `magazzino.storno` — primo punto di split operatore vs magazziniere.

---

## F. Checklist hardening residua (pre-chiusura definitiva)

### Database
- [x] migration stock integrity applicata (remote)
- [x] RLS `app_settings` magazzino master/stock_policy
- [ ] RPC DDT allineato a `operation_id` + origine `ddt`
- [x] nessun delete movimento operativo in FE

### Stock
- [x] idempotenza `operation_id` (path canonico)
- [x] storno service
- [ ] integrity checker con severità + exit code produzione

### Audit
- [x] before/delta/after su path canonico
- [x] origine enum su path canonico
- [ ] DDT RPC con payload standard

### RBAC
- [x] matrice seed + regression bypass
- [ ] smoke multi-ruolo browser (fuori scope audit statico)

### Scheda
- [x] quantità, consumo, copertura, ordini, movimenti, quick actions, QR stampa
- [ ] UI storno movimento (permission-aware)

