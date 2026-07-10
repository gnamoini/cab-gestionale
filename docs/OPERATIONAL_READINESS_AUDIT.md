# Operational Readiness Audit

**Data:** 2026-05-28  
**Scope:** Operational safety in real-world production (ops env, storage diagnostics, runtime health, disaster guards)  
**Prerequisito:** [RELEASE_READINESS_AUDIT.md](./RELEASE_READINESS_AUDIT.md) (release candidate + smoke layer)

---

## 1. Score summary

| Metrica | Score | Note |
|---------|-------|------|
| **OPERATIONAL READINESS** | **86/100** | Env validation, ops runbook, health/degradation layer |
| **PRODUCTION STABILITY** | 84/100 | Snapshot recovery + realtime transport; backup manuale Supabase |
| **SECURITY** | 88/100 | Allineato a `production:check` + ops-env blockers |
| **OBSERVABILITY** | 90/100 | Health snapshot, degradation detector, fatal aggregator |
| **MAINTAINABILITY** | 85/100 | `lib/ops/*`, script diagnostici, checklist |
| **DISASTER RECOVERY** | 72/100 | Recovery helpers + diagnostica; no PITR in codice |

**GO operativo:** **CONDIZIONED** — GO per merge e gate statici/codice; GO production pieno con backup Supabase documentato, secrets CI (`SUPABASE_*`, `SMOKE_*`) e `ops:diagnostics` verde su DB.

**Confidence:** 82%

---

## 2. Implementato in questa passata

| Componente | Percorso |
|------------|----------|
| Env validation ops | [`lib/ops/validate-production-env.ts`](../lib/ops/validate-production-env.ts) |
| Storage diagnostics | [`lib/ops/storage-consistency-diagnostics.ts`](../lib/ops/storage-consistency-diagnostics.ts) |
| Path da URL legacy (server-safe) | [`lib/documenti/storage-path-from-stored.ts`](../lib/documenti/storage-path-from-stored.ts) |
| Recovery helpers | [`lib/ops/recovery-helpers.ts`](../lib/ops/recovery-helpers.ts) |
| Report integrity audit | [`lib/report/report-integrity-audit.ts`](../lib/report/report-integrity-audit.ts) (`ReportDataIntegrityLayer`) |
| Runtime health | [`lib/observability/runtime-health.ts`](../lib/observability/runtime-health.ts) |
| Degradation detector | [`lib/observability/degradation-detector.ts`](../lib/observability/degradation-detector.ts) |
| Health bridge | [`components/observability/runtime-health-bridge.tsx`](../components/observability/runtime-health-bridge.tsx) |
| Ops scripts | `npm run ops:diagnostics`, `npm run ops:env-check` |
| Checklist | [`docs/ops-production-checklist.md`](./ops-production-checklist.md) |

**Metriche wire:** auth restore, dashboard/report load, route transition, modal open, realtime reconnect, polling fallback, hydration, storage delete failure, invalidation spike.

---

## 3. Gate eseguiti (2026-05-28)

Ambiente locale: **senza** `SUPABASE_SERVICE_ROLE_KEY`, **senza** `NEXT_PUBLIC_SUPABASE_*`, **senza** `SMOKE_*`.

| Comando | Esito | FAIL env vs codice |
|---------|-------|-------------------|
| `npm run ci:tsc` | **PASS** | — |
| `npm run ci:build` | **PASS** | — |
| `npm run ux:enforce` | **PASS** | — |
| `npm run ux:mobile-gate` | **PASS** (score 44, advisory) | — |
| `npm run smoke:structural` | **PASS** | — |
| `npm run smoke:regression` | **PASS** (include `ops:env-check` + `validate-production-env.test`) | — |
| `npm run production:check` | **PASS** (default, DB non richiesto) | — |
| `npm run production:check` con `PRODUCTION_CHECK_REQUIRE_DB=1` | **FAIL** | **ENV** — `feature-flag-db-not-checked` (service role / URL assenti) |
| `npm run ops:diagnostics` | **PASS** advisory | Warning ENV: storage diag saltata senza service role |
| `npm run ops:env-check` | **PASS** | — |
| `npm run release:gate` | **FAIL** a step `production:check` | **ENV** — gate imposta `PRODUCTION_CHECK_REQUIRE_DB=1` e `CI=true` (stesso blocker DB) |
| `npm run smoke:playwright` | Non eseguito | **ENV** — `SMOKE_*` assenti → SKIP in `release:gate` |

### Correzioni codice in verifica

| Problema | Fix |
|----------|-----|
| `Cannot find module 'server-only'` in `ops:diagnostics` / DB snapshot | Diagnostica storage importa solo [`storage-path-from-stored.ts`](../lib/documenti/storage-path-from-stored.ts), non `documenti-db-mapper` / `storage.service` |
| Blocker `storage-public-url-in-code` su diagnostica | Marker URL legacy centralizzati in `storage-path-from-stored.ts` (allowlist scan) |

---

## 4. Residual operational risks

### CRITICAL

- Nessuno da codice in questa passata.

### HIGH

| ID | Rischio | Mitigazione |
|----|---------|-------------|
| H1 | Backup Supabase solo processo manuale | Checklist ops + PITR dashboard |
| H2 | Orphan storage detection su campione root (500 oggetti) | `ops:diagnostics` + soglia `OPS_STORAGE_ORPHAN_WARN_THRESHOLD` |
| H3 | Service role assente in locale → DB check incompleto | Secrets solo su GitHub Actions / Vercel server |

### MEDIUM

| ID | Rischio | Mitigazione |
|----|---------|-------------|
| M1 | Health snapshot solo console (no backend) | Accettato; `NEXT_PUBLIC_CAB_OPS_WARN=1` per indagine |
| M2 | Preview Vercel senza staging slice | Warning `ops-env-preview-without-staging-slice` |
| M3 | Diagnostica orphan non cancella oggetti | By design — advisory only |

### LOW

| ID | Rischio | Mitigazione |
|----|---------|-------------|
| L1 | Contatori health in-memory per tab | Reset su refresh; bounded maps |
| L2 | `rbac.permission.mismatch` event definito ma non emesso in prod | Stale snapshot warn via `useEffectivePermissions` |

---

## 5. Likely production incidents

1. **Realtime down → polling 20s** — degradation warn; dashboard debounce su invalidation report.
2. **Delete documento parziale** — storage best-effort + `storage.delete.failure` counter.
3. **Permessi stale dopo admin change** — truth invalidation + `rbac.stale_snapshot` warn se query error.
4. **Spike invalidation post-login** — coalesce truth layer + fatal aggregator.
5. **Login rate limit** — smoke users dedicati in CI.

---

## 6. Scaling bottlenecks

- `ops:diagnostics` list bucket O(n) su campione 500 — OK per CI, non per full audit.
- Runtime health maps capped a 30 chiavi / 60s window.
- `production:check` con DB esegue snapshot + storage diag — accettabile in CI.

---

## 7. Maintenance complexity

- **Bassa-media:** moduli `lib/ops` e `lib/observability` isolati; nessuna nuova dipendenza npm.
- Runbook unificato in `ops-production-checklist.md`.
- Test ops in `smoke:regression`.

---

## 8. Technical debt residuo

- Full storage orphan walk (recursive prefix) non implementato.
- `recoverOperationalSnapshot` non sostituisce ancora tutti i call site di `refetchActiveOperationalSnapshot`.
- Backup/restore automatizzato fuori scope.
- Enterprise monitoring esterno non integrato.

---

## 9. Confronto release vs operational

| Aspetto | Release readiness | Operational readiness |
|---------|-------------------|---------------------|
| Focus | CI gate, smoke E2E, RBAC scan | Runbook, env, storage diag, runtime health |
| Score | ~88–94 | **86** |
| Blocker deploy | `release-gate` GitHub con secrets | + backup process + `ops:diagnostics` opzionale in CI |

**Raccomandazione:** in GitHub Actions configurare `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_*`, `SMOKE_*`; eseguire `ops:diagnostics` dopo `production:check` (advisory). In locale: `PRODUCTION_CHECK_REQUIRE_DB=0 npm run release:gate` solo per verifica codice senza DB.

---

## 10. Governance rollout (2026-05-29)

- [PLATFORM_STATUS_REPORT.md](./PLATFORM_STATUS_REPORT.md)
- [checklists/](./checklists/) — pre/post-deploy, rollback, incident
- [observability-ops.md](./observability-ops.md)
- [feature-evolution-rules.md](./feature-evolution-rules.md)
- [maintenance-governance.md](./maintenance-governance.md)
