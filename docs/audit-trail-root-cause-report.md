# Audit Trail — Root Cause Report

Data: 2026-07-18

## 1. Architettura

SSOT scrittura: `writeModificaLog()` in [`src/services/internal/audit-log.ts`](../src/services/internal/audit-log.ts) → `public.log_modifiche`.

SSOT lettura: `logService` / `useLogListQuery` (`QK.log`) → drawer/timeline pagina + `buildControlTowerActivityFeedSlice` (Dashboard).

Vedi [`docs/activity-feed-write-coverage-audit.md`](activity-feed-write-coverage-audit.md) per matrice per-pagina.

## 2. Root cause primaria (RC-1)

**Commit `4784cc1` (16 lug 2026)** ha introdotto scritture silenziose:

- `autore_id` assente → skip senza throw
- errore INSERT → `return` dopo `console.warn`
- `flushModificaLog` → `safeWriteModificaLogImmediate` (tutti i path ingoiavano errori)

**Fix:** `AuditLogWriteError`, throw su autore/insert, `flushModificaLog` → `writeModificaLogImmediate`. Lifecycle `pagehide` resta su safe path (best-effort).

## 3. Root cause secondaria (RC-2)

**Control Tower refactor** (`139dd18`, `32dd798`): `groupLogsByEntity` fondeva tutta la storia entità in una riga.

**Fix:** `splitLogsIntoTimeBursts` + merge per burst (5 min window).

## 4. Root cause architetturale (RC-3)

Audit application-layer opt-in senza enforcement CI. Gap su RPC/import chiusi in questa release.

## 5. Root cause DB (RC-4)

`20260902130000_document_capture_core.sql` ha sovrascritto `rbac_log_entita_module` eliminando mapping fatturazione/ddt/ordini/dipendenti.

**Fix:** migration [`20260918120000_rbac_log_entita_module_ssot.sql`](../supabase/migrations/20260918120000_rbac_log_entita_module_ssot.sql).

## 6. Evidenza DB pre-fix

| entita | righe | ultimo log |
|--------|-------|------------|
| lavorazioni | 27 | 2026-07-02 |
| dipendenti | 31 | 2026-07-02 |
| mezzi | 14 | 2026-07-02 |
| security | 20 | 2026-07-02 |
| scheda_lavorazione | 6 | 2026-07-01 |
| invoices | 2 | 2026-06-30 |

Nessun log dopo 2026-07-02 — coerente con RC-1 in produzione.

## 7. Modifiche effettuate

| Area | File |
|------|------|
| Write SSOT | `audit-log.ts`, `log-modifiche-batcher.ts` |
| Critical mutation | `magazzino.service.ts`, `movimenti.service.ts` |
| Feed builder | `control-tower-selectors.ts` |
| Write gaps | `invoices.service.ts`, `ddt.service.ts`, capture/import paths |
| DB RBAC | `20260918120000_rbac_log_entita_module_ssot.sql` |
| CI | `audit-log-no-silent-failure.test.ts`, `activity-write-coverage-audit.test.ts`, `rbac-log-entita-module-ssot.test.ts`, feed semantics/ssot tests |
| Scan | `scripts/audit-write-coverage-scan.ts`, `governance.audit.write-coverage` control |

## 8. Test eseguiti

```
activity-write-coverage-audit.test: OK
audit-log-no-silent-failure.test: OK
rbac-log-entita-module-ssot.test: OK
control-tower-activity-feed-semantics.test: OK
control-tower-activity-ssot-fidelity.test: OK
control-tower-selectors.test: OK
log-modifiche-retention.test: OK
audit-write-coverage-scan: OK (17 path)
```

## 9. Protocollo verifica E2E (post-deploy)

Per ogni pagina con log UI:

1. Eseguire operazione CRUD
2. `SELECT * FROM log_modifiche WHERE entita = ? ORDER BY created_at DESC LIMIT 5`
3. Aprire drawer log pagina → verifica riga presente
4. Dashboard Attività recenti → verifica feed (se dominio incluso)
5. Verifica refetch senza refresh manuale (Realtime / cab-sync-bus)

Script esistente: `scripts/verify-lavorazione-audit-db.ts` (estendere per altri domini).

## 10. Garanzie anti-regressione

- `REGRESSION_CORE` include test audit
- `npm run audit:write-coverage` in control plane PR gate
- Test statico: no silent failure in `audit-log.ts`
- Test statico: ultima migration `rbac_log_entita_module` = SSOT
- `commitCriticalMutation` obbligatorio su path magazzino feed-eligible

## 11. Rischi residui

| Rischio | Mitigazione |
|---------|-------------|
| Batch 3.5s magazzino | `commitCriticalMutation` |
| Retention 100/entita | Documentato; fuori scope feed recente |
| Security path parallelo | `writeSecurityAuditLog` documentato |
| Migration drift futuro | Test `rbac-log-entita-module-ssot.test.ts` |
