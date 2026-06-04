# Checklist operativa production

Runbook per deploy e manutenzione del gestionale CAB in produzione reale.

## Checklist collegate

| Checklist | Quando usarla |
|-----------|----------------|
| [rollout-checklist.md](./checklists/rollout-checklist.md) | Rollout reale, onboarding, scaling progressivo |
| [pre-deploy-checklist.md](./checklists/pre-deploy-checklist.md) | Prima di ogni merge/deploy su `main` |
| [post-deploy-checklist.md](./checklists/post-deploy-checklist.md) | Entro 30 min dal deploy production |
| [rollback-checklist.md](./checklists/rollback-checklist.md) | FAIL critico post-deploy |
| [incident-checklist.md](./checklists/incident-checklist.md) | Triage degradazioni e incidenti |

Template env: [`.env.production.example`](../.env.production.example), [`.env.smoke.example`](../.env.smoke.example)

## Secrets e ambienti

| Dove | Variabili | Note |
|------|-----------|------|
| **GitHub Actions** (`release-gate`) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Obbligatorie per `production:check` con DB |
| **GitHub Actions** (smoke) | `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD`, opz. `SMOKE_OPERATOR_*`, `SMOKE_DOCUMENTI_LAVORAZIONE_ID` | Playwright runtime |
| **Vercel Production** | Solo `NEXT_PUBLIC_*` necessarie al client | **Mai** `SUPABASE_SERVICE_ROLE_KEY` su Vercel |
| **Locale** | `.env.local` (non committare) | Service role solo per diagnostica |

## Comandi runbook

```powershell
npm run production:check
npm run ops:diagnostics
npm run release:gate
npm run smoke:structural
npm run smoke:regression
# Con credenziali:
npm run smoke:playwright
```

- `PRODUCTION_CHECK_REQUIRE_DB=1` — richiede connessione DB (come CI).
- `OPS_DIAGNOSTICS_REQUIRE_DB=1` — `ops:diagnostics` fallisce se DB assente.
- `SMOKE_SKIP=1` — salta Playwright in `smoke:gate` / `release:gate`.

## Branch protection e Vercel

1. GitHub: require check **release-gate** su `main`.
2. Vercel Deployment Protection: attendere check `release-gate` prima di production.
3. Vercel esegue **solo** `next build` — nessun `production:check` sul deploy.

## Preview vs production

- `VERCEL_ENV=preview` senza `NEXT_PUBLIC_STAGING_PUBLIC=1` → warning in `production:check` (preview non isolato).
- Non usare `NEXT_PUBLIC_STAGING_PUBLIC=1` su production Vercel.

## Supabase

### Backup (processo manuale)

- Abilitare backup / PITR dal dashboard Supabase (non automatizzato in app).
- Prima di migration distruttive: export SQL o snapshot progetto.

### RLS e tabelle critiche

- `user_permissions` — moduli granulari
- `profiles` — ruoli
- `documenti` — storage path in `url_file`
- `app_settings` — pilot e portale clienti (guard `rbac_is_restricted_app_settings_row`)

### Storage

- Bucket `documenti` deve essere **privato** (signed URL).
- Diagnostica orphan: `npm run ops:diagnostics` (advisory, campione 500 oggetti root).
- Inventario `url_file` / file mancanti: `npm run documenti:storage-inventory`.
- Bonifica URL legacy → path: `npm run documenti:remediate-url-file` (dry-run); `DOCUMENTI_REMEDIATE_APPLY=1` per applicare.
- Soglia warning orphan in CI: `OPS_STORAGE_ORPHAN_WARN_THRESHOLD` (default 10).

### Service role

- Usato solo in: server actions, script CI, `ops:diagnostics`, `production:check`.
- Mai esposto come `NEXT_PUBLIC_*`.

### Signed URL

- Documenti: TTL 3600s in [`lib/documenti/documenti-db-mapper.ts`](../lib/documenti/documenti-db-mapper.ts).
- Lavorazione PDF: [`lavorazione-documents.service.ts`](../src/services/lavorazione-documents.service.ts).

## Osservabilità production-safe

| Variabile | Produzione consigliata |
|-----------|------------------------|
| `NEXT_PUBLIC_OBS_LOG_LEVEL` | `info` |
| `NEXT_PUBLIC_OBS_PERF` | `0` (o `1` per indagine temporanea) |
| `NEXT_PUBLIC_CAB_OPS_WARN` | non impostare (solo debug mirato) |

Health snapshot client: log `ops.health.snapshot` ogni 120s in dev o con `CAB_OPS_WARN=1`.

## Pilot / feature flag

- `NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS` — **bloccato** in production.
- `app_settings.system.enable_operator_global_settings` — deve essere **off** in DB (verificato da `production:check`).

## Incidenti probabili

| Sintomo | Prima azione |
|---------|----------------|
| Login ok ma sezioni negate | Verificare `user_permissions` + truth layer |
| Report non aggiorna | Realtime + `scheduleReportBroadcastRefresh` |
| Documenti non aprono | Bucket privato + signed URL; no URL legacy pubblici |
| Log storm | Disattivare `CAB_OPS_WARN`; verificare invalidation spike in console JSON |

## Riferimenti

- [release-gate.md](./release-gate.md)
- [observability.md](./observability.md) · [observability-ops.md](./observability-ops.md)
- [feature-evolution-rules.md](./feature-evolution-rules.md)
- [maintenance-governance.md](./maintenance-governance.md)
- [PLATFORM_STATUS_REPORT.md](./PLATFORM_STATUS_REPORT.md)
- [RELEASE_READINESS_AUDIT.md](./RELEASE_READINESS_AUDIT.md)
- [OPERATIONAL_READINESS_AUDIT.md](./OPERATIONAL_READINESS_AUDIT.md)
