# Runtime truth layer

Unico strato di decisione runtime per permessi, pilot settings, invalidazione cache, transport sync e report KPI — senza duplicare logica tra guard, context e bridge.

## Moduli

| Percorso | Ruolo |
|----------|--------|
| [`src/lib/runtime/truth-layer/resolve-pilot-settings-state.ts`](../src/lib/runtime/truth-layer/resolve-pilot-settings-state.ts) | `resolvePilotSettingsState(dbEnabled)` — env, DB, effective, stato incoerente |
| [`src/lib/runtime/truth-layer/resolve-effective-permissions.ts`](../src/lib/runtime/truth-layer/resolve-effective-permissions.ts) | `resolveEffectivePermissions()` — moduli + `rbacContext` |
| [`src/lib/runtime/truth-layer/resolve-effective-permissions.server.ts`](../src/lib/runtime/truth-layer/resolve-effective-permissions.server.ts) | Snapshot server per RSC / actions |
| [`src/lib/runtime/truth-layer/use-effective-permissions.ts`](../src/lib/runtime/truth-layer/use-effective-permissions.ts) | Hook client canonico |
| [`src/lib/runtime/truth-layer/invalidate-runtime-truth.ts`](../src/lib/runtime/truth-layer/invalidate-runtime-truth.ts) | Hub invalidazione auth/pilot (con coalescing in-flight) |
| [`src/lib/runtime/truth-layer/invalidate-operational-truth.ts`](../src/lib/runtime/truth-layer/invalidate-operational-truth.ts) | `invalidateOperationalTruth({ domain })` — CRUD documenti/lavorazioni/mezzi/magazzino/report |
| [`lib/documenti/delete-documento-fully.ts`](../lib/documenti/delete-documento-fully.ts) | `deleteDocumentoFully()` — DB + bucket `documenti` |
| [`components/gestionale/gestionale-modal.tsx`](../components/gestionale/gestionale-modal.tsx) | `GestionaleModalShell` + `useGestionaleModal` (scroll lock / z-index canonici) |
| [`src/lib/runtime/truth-layer/invalidate-runtime-truth.server.ts`](../src/lib/runtime/truth-layer/invalidate-runtime-truth.server.ts) | `clearServerAuthSnapshotCache` + `revalidatePath` |
| [`src/lib/runtime/sync/sync-transport-controller.ts`](../src/lib/runtime/sync/sync-transport-controller.ts) | Realtime **oppure** polling (mutuamente esclusivi) |
| [`lib/report/resolve-magazzino-report-log.ts`](../lib/report/resolve-magazzino-report-log.ts) | Log magazzino report: server-first + cache locale |
| [`lib/report/report-kpi-selectors.ts`](../lib/report/report-kpi-selectors.ts) | KPI magazzino condivisi dashboard / report |

## Consumatori

- **Guard server:** `verifyServerPermission` → `resolveServerEffectivePermissions()`
- **Guard client:** `ensurePermission` → `fetchClientEffectivePermissionsSnapshot()`
- **Hook UI:** `useRbac()` → `useEffectivePermissions()` (API invariata)
- **Pilot UI:** `OperatorGlobalSettingsProvider` → `resolvePilotSettingsState`
- **Realtime:** `GestionaleRealtimeBridge` → `SyncTransportController` + `invalidateRuntimeTruth` su `app_settings` / `user_permissions` / `profiles`
- **Report:** `useReportLiveData` → `log_modifiche` + `resolveMagazzinoReportLogEntries`

## RBAC a 4 livelli (route vs dati)

| Livello | Dove | Cosa decide |
|---------|------|-------------|
| 1 | Postgres RLS | Lettura/scrittura righe (`user_permissions`, capability SQL) |
| 2 | Truth layer | `resolveEffectivePermissions` — moduli + pilot |
| 3 | Server RSC / actions | `verifyServerPermission`, layout `impostazioni` / `security` |
| 4 | Edge `proxy-handler` | Sessione + ruolo + pilot DB su `/impostazioni` + portale clienti; **non** replica tutti i moduli (evita fetch pesante) |

Client: `RbacPageGuard` + `GestionaleSectionGate` usano [`can-access-route.ts`](../src/lib/auth/can-access-route.ts) quando lo snapshot permessi è pronto.

## Split RLS vs applicazione

- **Postgres RLS:** enforcement con flag DB (`rbac_operator_global_settings_db_enabled`) — non legge env Next.js.
- **UI / guard:** `effectiveEnabled` = env ∧ DB via truth layer.

## Eventi invalidazione

| Evento | Client | Server |
|--------|--------|--------|
| Logout | `invalidateRuntimeTruth({ reason: 'logout' })` poi `queryClient.clear()` | — |
| Login | `sessionEstablished` (coalesced) | — |
| Cambio permessi / ruolo | `roleOrPermissionsChanged` (coalesced) | `invalidateServerRuntimeTruth()` |
| Pilot / app_settings | `pilotChanged` + refetch operational (coalesced) | `invalidateServerRuntimeTruth()` |

### Domini operativi (`invalidateOperationalTruth`)

| `domain` | Tabelle / effetti |
|----------|-------------------|
| `documenti` | `documenti` |
| `lavorazioni` | `lavorazioni`, `scheda_lavorazione`, `documenti`, `movimenti_ricambi`, `preventivi` + `bumpReportDataRefresh` |
| `mezzi` | `mezzi`, `lavorazioni`, `preventivi`, `documenti`, `log_modifiche` |
| `magazzino` | `magazzino_ricambi`, `movimenti_ricambi`, `lavorazioni`, `log_modifiche` + report broadcast |
| `report` | `log_modifiche` (solo entità magazzino/movimenti), `reportManualEntries` + `bumpReportDataRefresh` |

Opzione `skipReportBroadcast: true` su `invalidateOperationalTruth` — refresh interno report (`scheduleReportBroadcastRefresh`) senza loop broadcast.

### Query policies VIEW

Policy centralizzate in [`lib/react-query/query-layer-policies.ts`](../lib/react-query/query-layer-policies.ts): VIEW 60s, report 120s, log feed limit 200. Report usa **una sola** fetch lavorazioni (`includeMezzo` senza `archived`); vedi [`docs/performance-query-policies.md`](performance-query-policies.md).

Eventi osservabilità correlati: `cache.invalidate.truth`, `cache.invalidate.operational`, `realtime.flush` — vedi [`docs/observability.md`](observability.md).

I wrapper in [`invalidate-related.ts`](../src/lib/react-query/invalidate-related.ts) (`invalidateAfterMezzoMutations`, …) delegano a questo hub. Evitare `queryClient.invalidateQueries` diretti su query gestionale salvo eccezioni documentate (theme, undo, query scoped).

## Rischi mitigati

| ID | Rischio | Mitigazione |
|----|---------|-------------|
| C1 | RBAC/pilot incoerente tra env, DB, guard | `resolveEffectivePermissions` + `resolvePilotSettingsState` |
| H2 | Snapshot server stale dopo cambio ruolo | `clearServerAuthSnapshotCache` + revalidate layout |
| H3 | Realtime + polling simultanei | `SyncTransportController` esclusivo |
| M1 | Report magazzino da localStorage vs dashboard | Server `log_modifiche` + KPI selectors condivisi |

## Deprecati

- `fetchOperatorGlobalSettingsDbEnabledClient` nei guard (usare truth layer)
- `computePilotState` in `security-release-control` (usare `resolvePilotSettingsState`)
- `loadMagazzinoChangeLog` come fonte primaria report (usare `readLocalMagazzinoLogCache` + server)
