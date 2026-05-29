# Feature evolution rules

Linee guida per future feature — evitare regressioni su truth layer, release gate, mobile, modal stack, report consistency.

**Non sostituisce** la documentazione architetturale esistente; punta alle fonti canoniche.

## PR gate mentale

Prima di ogni PR feature, rispondere:

> Rompe truth layer / release gate / mobile stability / modal stack / operational invalidation / report consistency?

Se **sì** a uno qualsiasi → **NO** o richiede redesign minimo.

---

## Architectural rules

| Regola | Dettaglio | Fonte |
|--------|-----------|-------|
| Invalidation hub | Usare solo `invalidateRuntimeTruth` e `invalidateOperationalTruth` | [runtime-truth-layer.md](./runtime-truth-layer.md) |
| No invalidate diretto | Evitare `queryClient.invalidateQueries` su query gestionale | [invalidate-related.ts](../src/lib/react-query/invalidate-related.ts) |
| Query policies | Rispettare stale times VIEW 60s, report 120s | [performance-query-policies.md](./performance-query-policies.md) |
| Report broadcast | Usare `skipReportBroadcast` per evitare loop | [runtime-truth-layer.md](./runtime-truth-layer.md) |
| Delete documenti | Solo `deleteDocumentoFully()` per DB + storage | [delete-documento-fully.ts](../lib/documenti/delete-documento-fully.ts) |

---

## Runtime rules

| Regola | Dettaglio |
|--------|-----------|
| Sync transport | Non bypassare `SyncTransportController`; realtime e polling mutuamente esclusivi |
| Coalescing | Rispettare debounce invalidation dashboard (400ms) e coalesce truth layer |
| Pilot settings | `resolvePilotSettingsState` — env ∧ DB, mai logica duplicata |
| Permessi | `useEffectivePermissions` / `resolveEffectivePermissions` — unica fonte client/server |
| Recovery | Preferire `recoverOperationalSnapshot` pattern vs refetch ad hoc |

---

## Modal rules

| Regola | Dettaglio |
|--------|-----------|
| Shell canonica | Solo `GestionaleModalShell` + `useGestionaleModal` |
| Scroll lock | Solo `useBodyScrollLock` — no implementazioni custom |
| Mobile | Passare `ux:mobile-gate` (scroll containment, safe-area) |
| Stacked modals | Evitare stack profondi; gap smoke noto — testare manualmente su mobile |

Fonte: [bootstrap-hydration.md](./bootstrap-hydration.md), [gestionale-modal.tsx](../components/gestionale/gestionale-modal.tsx)

---

## Invalidation rules

| Tipo | Quando | Hub |
|------|--------|-----|
| Auth / RBAC / pilot | Login, logout, permessi, app_settings | `invalidateRuntimeTruth` |
| CRUD operativo | documenti, lavorazioni, mezzi, magazzino | `invalidateOperationalTruth({ domain })` |
| Report interno | Refresh report senza broadcast loop | `skipReportBroadcast: true` |

Domini supportati: `documenti`, `lavorazioni`, `mezzi`, `magazzino`, `report`.

Spike invalidation → fatal aggregator — non aumentare frequenza invalidate.

---

## Realtime rules

| Regola | Dettaglio |
|--------|-----------|
| Bridge | Mutazioni passano da `GestionaleRealtimeBridge` |
| Fallback polling | Accettato se realtime down — non rimuovere transport controller |
| Reconnect | Backoff max 30s — non forzare reconnect loop |
| Eventi | `realtime.polling.fallback` atteso sotto degradazione |

Fonte: [sync-transport-controller.ts](../src/lib/runtime/sync/sync-transport-controller.ts)

---

## RBAC rules

| Livello | Dove | Regola |
|---------|------|--------|
| 1 RLS | Postgres | Capability SQL + `user_permissions` — migration obbligatoria per nuovi moduli |
| 2 Truth | Client/server snapshot | `resolveEffectivePermissions` |
| 3 Server guards | RSC, actions | `verifyServerPermission` |
| 4 Edge | proxy-handler | Sessione + pilot su route sensibili |

| Regola | Dettaglio |
|--------|-----------|
| Matrice frontend | Aggiornare [`lib/rbac.ts`](../lib/rbac.ts) + [`can-access-route.ts`](../src/lib/auth/can-access-route.ts) |
| Moduli | Registrare in [`gestionale-modules.ts`](../src/lib/permissions/gestionale-modules.ts) |
| Route guard | `RbacPageGuard` + `GestionaleSectionGate` |
| Production | Mai pilot flag in production env/DB |

---

## Mobile rules

| Regola | Dettaglio |
|--------|-----------|
| Gate CI | `npm run ux:mobile-gate` deve PASS |
| Tooltip | No tooltip-only su mobile (gate blocker) |
| Scroll | Containment scroll in liste dense; no overflow orizzontale |
| Safe area | Rispettare token app-shell |
| iOS | Scroll lock via `position: fixed` — no hack alternativi |

Fonte: [scripts/ux-mobile-regression-gate.ts](../scripts/ux-mobile-regression-gate.ts)

---

## SSR rules

| Regola | Dettaglio |
|--------|-----------|
| Auth bootstrap | Server snapshot + client hydration allineati |
| No mismatch | Evitare render condizionale client-only su dati auth |
| Hydration | Smoke `07-hydration-runtime` deve PASS dopo modifiche layout |
| Date/locale | Formattazione consistente server/client |

Fonte: [bootstrap-hydration.md](./bootstrap-hydration.md)

---

## UX rules

| Regola | Dettaglio |
|--------|-----------|
| Toast | `useGestionaleToast()` — no `useToast` diretto |
| Confirm | `useGestionaleConfirm()` — no `window.confirm` |
| Alert | Vietato `window.alert/confirm/prompt` |
| Tabelle | `GestionaleListTable` + token [`gestionale-list-table`](../lib/ui/gestionale-list-table) |
| Errori | Messaggi humanizzati — no stack trace in UI |

Fonte: [ux-enforcement.md](./ux-enforcement.md), [AGENTS.md](../AGENTS.md)

---

## Release gate compatibility

Ogni feature deve mantenere verde:

- `ci:tsc`, `ci:build`
- `ux:enforce`, `ux:mobile-gate`
- `production:check` (RBAC, storage, pilot, legacy URLs)
- `smoke:structural`, `smoke:regression`
- `smoke:playwright` (flow critici)

Non aggiungere gate paralleli su Vercel. Vedi [release-gate.md](./release-gate.md).

---

## Riferimenti

- [maintenance-governance.md](./maintenance-governance.md)
- [observability-ops.md](./observability-ops.md)
- [feature-evolution-rules.md](./feature-evolution-rules.md) ← questo documento
