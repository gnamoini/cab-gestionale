# Incident checklist

Triage operativo per degradazioni e incidenti in production.

## Step 0 — Classificazione rapida

| Severità | Azione immediata |
|----------|------------------|
| **Critical** | Rollback o fix hotfix; notificare team |
| **Warning** | Monitorare 15–30 min; indagine console |
| **Info** | Log only; nessuna azione |

Vedi [observability-ops.md](../observability-ops.md) per definizioni severity.

## Step 1 — Verifiche in ordine

1. [ ] Gate CI verde sullo SHA deployato? → se no: problema release, non runtime isolato
2. [ ] Sintomo replicabile con utente specifico?
3. [ ] Console JSON: filtrare per `route`, `userId`, `level=error|warn`
4. [ ] `ops.health.snapshot`: spike `pollingFallback`, `hydrationMismatch`?
5. [ ] `/dashboard/security/production-readiness` — blockers?
6. [ ] Supabase status page / realtime connectivity

## Triage per sintomo

### Login / auth

| Sintomo | Controllare | Ignorare |
|---------|-------------|----------|
| Login fallisce | Supabase Auth, rate limit, credenziali | Singolo timeout rete |
| Login ok, sezioni negate | `user_permissions`, `profiles.ruolo`, truth layer RBAC | Cache stale <30s post-perm change |
| Sessione persa | `auth.session.invalid`, cookie domain | Refresh tab normale |

**Grave:** login impossibile per tutti → Critical → [rollback](./rollback-checklist.md)

### Report / dashboard

| Sintomo | Controllare | Ignorare |
|---------|-------------|----------|
| Report non aggiorna | Realtime down → polling fallback; `report.data.error` | Singolo `realtime.reconnect` |
| Dashboard lenta | `dashboardLoadMs`, `reportLoadMs` in snapshot | Prima load lenta cold start |
| Spinner infinito | Network tab, `report.data.error` persistente | Debounce 400ms post-invalidation |

**Grave:** `ops.degradation.invalidation_storm` → Critical

### Documenti / storage

| Sintomo | Controllare | Ignorare |
|---------|-------------|----------|
| Documento non apre | Bucket privato, signed URL TTL, path legacy | Singolo retry upload |
| Upload fallisce | `documenti.upload.failed`, size limit 100MB | Rate limit sporadico |
| Delete parziale | `storage.delete.failure`, DB vs bucket | Best-effort warn singolo |

**Grave:** URL pubblici legacy esposti → Critical (security)

### Hydration / runtime

| Sintomo | Controllare | Ignorare |
|---------|-------------|----------|
| Console hydration error | `runtime.hydration.mismatch`, route specifica | Warning dev-only |
| White screen | `boundary.crash`, Next error boundary | — |
| Mobile scroll bloccato | Modal scroll-lock non rilasciato | — |

**Grave:** hydration ripetuta su route core → Critical → rollback

### Log storm

| Sintomo | Controllare | Ignorare |
|---------|-------------|----------|
| Console flood | `CAB_OPS_WARN=1` attivo? invalidation spike? | `cache.invalidate.truth` debug |
| Performance degradata | `perf.slow` con `OBS_PERF=1` | Coalesced invalidation info |

**Azione:** disattivare `NEXT_PUBLIC_CAB_OPS_WARN`; verificare loop invalidation

## Expected noise (ignorare)

- Singolo `realtime.reconnect`
- `cache.invalidate.coalesced`
- Score euristico mobile gate (warnings non blocker)
- `auth.restore.duration` <3s
- Polling fallback sporadico (<3 in 5 min)

## Realmente grave (agire)

- `ops.degradation.invalidation_storm`
- `runtime.hydration.mismatch` ripetuto
- `report.data.error` persistente
- Login ok + RBAC deny su route autorizzata
- `ops.degradation.polling_fallback` continuo (>2 in 5 min ripetuto)

## Recovery helpers

- Snapshot refetch: [`lib/ops/recovery-helpers.ts`](../../lib/ops/recovery-helpers.ts)
- Storage diagnostics: `npm run ops:diagnostics`
- Production check: `npm run production:check`

## Escalation

- [ ] Documentare: ora, SHA, sintomo, utenti impattati, log rilevanti
- [ ] Se Critical non risolvibile in 30 min → [rollback](./rollback-checklist.md)
- [ ] Post-incident: aggiornare checklist se gap trovato

## Riferimenti

- [observability-ops.md](../observability-ops.md)
- [ops-production-checklist.md](../ops-production-checklist.md)
