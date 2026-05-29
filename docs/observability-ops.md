# Observability ops — monitoring governance

Guida operativa per monitoraggio production. Organizza l'observability esistente (console-only, no backend APM).

Per dettagli tecnici su moduli e eventi: [observability.md](./observability.md).

## 1. Operational dashboard data

Riferimento metriche per triage production. Nessuna UI dedicata — lettura via console browser.

### Segnali richiesti

| Segnale | Sorgente codice | Evento / counter / metric | Come leggerlo |
|---------|-----------------|---------------------------|---------------|
| Runtime errors | `GestionaleClientErrorBoundary`, `app/error.tsx` | `recordFatal("boundary.crash")`, `gestionaleLogger.error` | Console: `level=error`, fatal kind `boundary.crash` |
| Hydration mismatch | `observability-provider.tsx` | `runtime.hydration.mismatch`, counter `hydrationMismatch` | Console: event error; snapshot counter |
| Polling fallback | `sync-transport-controller.ts` | `realtime.polling.fallback`, `ops.degradation.polling_fallback` | Warn dopo >2 attivazioni in 5 min |
| Auth restore latency | `auth-context.tsx` | `auth.restore.duration`, metric `authRestoreMs` | Info con `durationMs`; snapshot `authRestoreMs.lastMs` |
| Report latency | `use-report-live-data.ts` | `report.data.ready`, metric `reportLoadMs` | Info con `durationMs` |
| Dashboard latency | `use-dashboard-metrics.ts` | `dashboard.load.duration`, metric `dashboardLoadMs` | Info prima load riuscita |
| Modal failures | **Gap parziale** | Solo `modalOpenMs` (latency in health) | Errori modali → boundary generico |
| Storage failures | `delete-documento-fully.ts`, `documenti-db-mapper.ts` | `storage.delete.failure`, `documenti.upload.failed` | Warn; counter `storageDeleteFailure` |

### Health snapshot (`ops.health.snapshot`)

Emesso ogni 120s in dev o con `NEXT_PUBLIC_CAB_OPS_WARN=1` ([`runtime-health-bridge.tsx`](../components/observability/runtime-health-bridge.tsx)).

Struttura ([`runtime-health.ts`](../lib/observability/runtime-health.ts)):

```json
{
  "ts": "2026-05-29T…",
  "counters": {
    "pollingFallback": 0,
    "hydrationMismatch": 0,
    "invalidateTruthSpike": 0,
    "realtimeReconnect": 1,
    "storageDeleteFailure": 0,
    "perfSlow": 0,
    "invalidateOperationalBurst": 0
  },
  "metrics": {
    "authRestoreMs": { "lastMs": 420, "samples": 1 },
    "dashboardLoadMs": { "lastMs": 890, "samples": 1 },
    "reportLoadMs": { "lastMs": 1200, "samples": 1 },
    "routeTransitionMs": { "lastMs": 180, "samples": 3 },
    "modalOpenMs": { "lastMs": 95, "samples": 2 }
  }
}
```

Finestra contatori: rolling 60s. Max 30 chiavi.

### Degradation warnings (`ops.degradation.*`)

| Chiave | Soglia | Fonte |
|--------|--------|-------|
| `ops.degradation.invalidation_storm` | >5 spike truth in 10s | `degradation-detector.ts` |
| `ops.degradation.realtime_reconnect` | >3 reconnect in 60s | idem |
| `ops.degradation.polling_fallback` | >2 fallback in 5 min | idem |
| `ops.degradation.query_storm` | >8 `perf.slow` in 30s | idem (con `OBS_PERF=1`) |

### Lettura in production

1. Abilitare temporaneamente `NEXT_PUBLIC_CAB_OPS_WARN=1` su Vercel
2. Aprire DevTools → Console → filtrare `ops.health.snapshot` o `level`
3. Replicare sintomo utente con stesso ruolo/route
4. **Disabilitare** `CAB_OPS_WARN` dopo indagine

### Known gap (stabilità-first, no fix in questa fase)

- Eventi modal-specific failure non esistono — solo latency `modalOpenMs`
- Next.js `error.tsx` logga ma non alimenta fatal aggregator
- `rbac.permission.mismatch` definito ma non emesso
- Metriche per-tab, reset su refresh

---

## 2. Severity levels

| Livello | Criterio operativo | Esempi | Azione |
|---------|-------------------|--------|--------|
| **Critical** | Perdita funzione core, sicurezza o integrità dati | Hydration ripetuta su route core; login impossibile per tutti; RLS bypass; URL storage pubblici legacy; `report.data.error` persistente | Rollback o hotfix immediato |
| **Warning** | Degradazione con auto-recovery o impatto limitato | Polling fallback sporadico; reconnect realtime; auth restore >3s; storage delete best-effort fail; singolo upload fail | Monitorare 15–30 min; [incident checklist](./checklists/incident-checklist.md) |
| **Info** | Telemetria normale / expected noise | Login success; prima dashboard load; `cache.invalidate.coalesced`; singolo reconnect | Nessuna azione |

Allineamento log level: [`events.ts`](../lib/observability/events.ts) `EVENT_LEVEL`.

---

## 3. Production debugging flow

### Ordine di controllo

```
1. Gate CI verde sullo SHA deployato?
   → NO: problema release/deploy, non runtime isolato

2. Sintomo replicabile con utente/route specifica?
   → Console JSON filtrata per route + userId

3. ops.health.snapshot — spike counters?
   → pollingFallback, hydrationMismatch, invalidateTruthSpike

4. /dashboard/security/production-readiness — blockers?
   → env, storage, RBAC, pilot flags

5. Supabase status / realtime
   → polling fallback atteso se realtime down
```

### Cosa controllare prima

| Priorità | Controllo |
|----------|-----------|
| 1 | SHA deploy = gate verde |
| 2 | Env Vercel (no service role, no pilot) |
| 3 | `user_permissions` + `profiles` per utente impattato |
| 4 | Console errors/warns strutturati |
| 5 | Supabase Auth + Realtime status |

### Cosa ignorare (expected noise)

- Singolo `realtime.reconnect`
- `cache.invalidate.truth.coalesced`
- Score euristico mobile gate (warnings non blocker in CI)
- `auth.restore.duration` <3000ms
- Polling fallback isolato (< soglia degradation)
- Debug events con `NEXT_PUBLIC_OBS_LOG_LEVEL=debug` (non usare in prod)

### Cosa è realmente grave

- `ops.degradation.invalidation_storm`
- `runtime.hydration.mismatch` ripetuto (>1 in sessione su stessa route)
- `report.data.error` su ogni tentativo load
- Login ok + RBAC deny persistente su route autorizzata
- `ops.degradation.polling_fallback` continuo
- `boundary.crash` / white screen

### Env production-safe

| Variabile | Valore |
|-----------|--------|
| `NEXT_PUBLIC_OBS_LOG_LEVEL` | `info` |
| `NEXT_PUBLIC_OBS_PERF` | `0` (temporaneo `1` per indagine query) |
| `NEXT_PUBLIC_CAB_OPS_WARN` | unset (temporaneo `1` per snapshot) |

---

## Riferimenti

- [incident-checklist.md](./checklists/incident-checklist.md)
- [ops-production-checklist.md](./ops-production-checklist.md)
- [observability.md](./observability.md)
