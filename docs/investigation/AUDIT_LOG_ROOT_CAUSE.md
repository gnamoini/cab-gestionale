# Audit Log — Root Cause Report

Data: 2026-07-19

## Sintomo

Drawer **Log modifiche** vuoto su **tutte le pagine**, nonostante modifiche effettuate in app.

## Evidenza DB (produzione `oxmnuovsgenqkuwfolqh`)

| Metrica | Valore |
|---------|--------|
| Righe totali `log_modifiche` | 101 |
| Ultimo log globale | 2026-07-19 15:18 UTC (`movimenti_ricambi` CREATE) |
| Ultimo log `lavorazioni` | 2026-07-02 |
| Ultimo log `mezzi` | 2026-07-02 |
| Migration retention fix | Applicata 2026-07-19 (`fix_prune_log_modifiche_retention_old_alias`) |
| Migration RBAC SSOT | `20260919120100` applicata |
| Funzione `prune_log_modifiche_retention` | Fix `prune_row` confermato in DB |

**Conclusione write-side:** INSERT **funziona** dopo fix retention (evidenza: log magazzino odierno). Gap 2026-07-02 → 2026-07-19 causato da failure globale INSERT.

---

## Root Cause confermate

### RC-1 — Scritture silenziose (application layer)

| | |
|---|---|
| **Causa** | Commit `4784cc18` (2026-07-16): `flushModificaLog` → `safeWriteModificaLogImmediate`, errori INSERT → `return` dopo warn |
| **Impatto** | Mutazioni apparentemente OK, zero righe in DB, nessun errore UI |
| **File** | `src/services/internal/audit-log.ts` |
| **Da quando** | 2026-07-16 |
| **Fix** | `AuditLogWriteError` + throw; `flushModificaLog` → `writeModificaLogImmediate` (commit `91a7007f`) |
| **Stato** | **Risolto in codice** |

### RC-2 — Trigger retention PL/pgSQL (database layer)

| | |
|---|---|
| **Causa** | Migration `20260603120000`: alias tabella `old` in `DELETE FROM log_modifiche old` collide con `NEW`/`OLD` trigger → errore `42702` su **ogni** INSERT |
| **Impatto** | Zero nuovi log dal 2026-06-04 al fix; drawer vuoto dopo retention deploy |
| **File** | `supabase/migrations/20260603120000_log_modifiche_retention_100.sql` |
| **Da quando** | 2026-06-04 |
| **Fix** | `20261019140000_fix_prune_log_modifiche_retention_old_alias.sql` (alias `prune_row`) |
| **Stato** | **Risolto in DB** (applicato 2026-07-19) |

### RC-3 — RBAC mapping regression

| | |
|---|---|
| **Causa** | `20260902130000_document_capture_core.sql` ridefiniva `rbac_log_entita_module` con mapping incompleto |
| **Impatto** | INSERT/SELECT falliti per entità fatturazione, ddt, dipendenti, ordini |
| **File** | `supabase/migrations/20260919120100_rbac_log_entita_inventory_receiving.sql` |
| **Fix** | SSOT mapping completo |
| **Stato** | **Risolto in DB** |

### RC-4 — Drawer preventivi/documenti su localStorage (read layer)

| | |
|---|---|
| **Causa** | `preventivi-view.tsx` / `documenti-view.tsx` leggevano solo `localStorage` change-log, non `log_modifiche` SSOT |
| **Impatto** | Drawer vuoto anche con righe in DB (service scriveva su `log_modifiche` via `writeModificaLog`) |
| **File** | `components/preventivi/preventivi-view.tsx`, `components/gestionale/documenti/documenti-view.tsx`, drawer correlati |
| **Fix** | `useLogListQuery({ entita })` + `buildLogModificheDisplayEntries` |
| **Stato** | **Risolto in questa release** |

### RC-5 — Error swallowing residuo (path paralleli)

| | |
|---|---|
| **Causa** | `void logEntry.create`, `logService.create` ignorato, `.catch(() => undefined)` su `writeModificaLog` |
| **File** | `lavorazioni-view.tsx`, `lavorazione-documents.service.ts`, `ddt-extraction-processor.server.ts` |
| **Fix** | SSOT `writeModificaLog` + propagazione errori / toast |
| **Stato** | **Risolto in questa release** |

---

## Pipeline — stato post-fix

| Step | Stato | Note |
|------|-------|------|
| UI mutation | OK | |
| Domain service | OK | `writeModificaLog` su CRUD |
| `writeModificaLog` | OK | Throw su failure |
| INSERT `log_modifiche` | OK | Verificato 2026-07-19 |
| Trigger retention | OK | `prune_row` fix |
| RLS INSERT | OK | `cap_log_insert` + mapping SSOT |
| `emitCabSyncEvent` | OK | Post-INSERT client |
| Realtime → `QK.log` | OK | `invalidate-targets.ts` |
| `useLogListQuery` SELECT | OK | Tutti i drawer server-side |
| Drawer render | OK | SSOT read allineato |

---

## File modificati (questa release)

| File | Modifica |
|------|----------|
| `docs/investigation/AUDIT_LOG_ARCHITECTURE.md` | Inventario architettura |
| `docs/investigation/AUDIT_LOG_ROOT_CAUSE.md` | Questo report |
| `components/preventivi/preventivi-view.tsx` | Drawer → `useLogListQuery` |
| `components/preventivi/preventivi-log-drawer.tsx` | VM SSOT |
| `components/gestionale/documenti/documenti-view.tsx` | Drawer → `useLogListQuery` |
| `components/gestionale/documenti/documenti-log-drawer.tsx` | VM SSOT |
| `components/gestionale/lavorazioni/lavorazioni-view.tsx` | `writeModificaLog` su addetto row |
| `src/services/lavorazione-documents.service.ts` | SSOT write |
| `lib/inventory-receiving/extraction/ddt-extraction-processor.server.ts` | No silent catch |
| `lib/regression/audit-log-pipeline.test.ts` | Test anti-regressione |
| `scripts/verify-audit-log-pipeline.ts` | Smoke post-deploy |
| DB migration | `fix_prune_log_modifiche_retention_old_alias` applicata |

---

## Verifica

```bash
npx tsx lib/regression/audit-log-no-silent-failure.test.ts
npx tsx lib/regression/audit-log-pipeline.test.ts
npx tsx lib/regression/rbac-log-entita-module-ssot.test.ts
npx tsx scripts/verify-audit-log-pipeline.ts
```

---

## Rischi residui

| Rischio | Mitigazione |
|---------|-------------|
| Batch magazzino 3.5s | `commitCriticalMutation` |
| Security path parallelo | `writeSecurityAuditLog` documentato |
| Retention 100/entita | Fuori scope feed recente |
| localStorage append (preventivi editor) | Solo UX editor; display SSOT |
