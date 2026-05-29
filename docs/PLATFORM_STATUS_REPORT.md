# Platform Status Report

**Data:** 2026-05-29  
**Scope:** Platform governance, controlled rollout readiness, operational maturity  
**Prerequisiti:** [RELEASE_READINESS_AUDIT.md](./RELEASE_READINESS_AUDIT.md), [OPERATIONAL_READINESS_AUDIT.md](./OPERATIONAL_READINESS_AUDIT.md)

---

## 1. PLATFORM MATURITY SCORE

**87 / 100**

| Area | Score | Note |
|------|-------|------|
| CI/CD gate-first | 95 | Single authority GitHub Actions, 8 step |
| Production readiness | 85 | Static PASS; DB check richiede secrets CI |
| Observability | 90 | Console-only, health + degradation layer |
| Ops documentation | 88 | Checklist rollout, observability-ops, governance |
| Disaster recovery | 72 | Backup manuale Supabase, no PITR in codice |
| Test coverage | 82 | tsx regression + Playwright smoke; no Vitest |

---

## 2. RELEASE CONFIDENCE SCORE

**82 / 100** (locale senza secrets) · **94 / 100** (con CI secrets + Playwright verde)

| Fattore | Impatto |
|---------|---------|
| Gate statici verdi | +40 |
| production:check + DB in CI | +12 (richiede secrets) |
| Playwright smoke in CI | +10 (richiede SMOKE_*) |
| Branch protection configurata | +8 (config esterna repo) |
| Vercel Deployment Protection | +8 (config esterna Vercel) |
| Fork PR skip gate | -4 |

**GO production:** condizionato — secrets GitHub + branch protection + Vercel protection.

---

## 3. OPERATIONAL STABILITY SCORE

**84 / 100**

| Componente | Stato |
|------------|-------|
| Truth layer + invalidation coalesce | Stabilizzato |
| Realtime transport + polling fallback | Stabilizzato |
| Auth bootstrap + hydration guards | Stabilizzato |
| RBAC 4-level | Stabilizzato |
| Storage signed URL privato | Stabilizzato |
| Backup automatizzato | Non in codice (-8) |
| External APM | Assente by design (-4) |
| Modal stacked coverage | Gap smoke (-4) |

---

## 4. MAINTAINABILITY SCORE

**85 / 100**

| Asset | Valutazione |
|-------|-------------|
| `lib/ops/*` diagnostica | Buono |
| `lib/observability/*` | Buono, ben isolato |
| Governance docs (checklist, feature rules, maintenance) | Aggiunto 2026-05-29 |
| Env templates (`.env.production.example`, `.env.smoke.example`) | Aggiunto |
| Deprecated API residue | Medio (-5) |
| Test framework misto tsx + Playwright | Accettabile (-5) |

---

## 5. SCALABILITY READINESS

**Medio-alto**

| Dimensione | Readiness | Limite noto |
|------------|-----------|-------------|
| Utenti concorrenti | Medio-alto | Realtime reconnect backoff 30s |
| Storage documenti | Medio | Orphan audit campione 500 root |
| CI pipeline | Medio | Playwright serial ~4–8 min |
| Client observability | Basso | In-memory per tab, no backend |
| DB migrations | Alto | 60+ migration, RLS hardened |

Scaling progressivo raccomandato: pilot 1–3 → operatori 5–10 → full ([rollout-checklist.md](./checklists/rollout-checklist.md)).

---

## 6. TOP 10 RISCHI FUTURI

1. **Backup Supabase solo manuale** — nessun PITR automatizzato in repo
2. **CI Playwright senza SMOKE_*** — workflow FAIL se secrets assenti
3. **Hydration su route pesanti** (kanban lavorazioni) — smoke parziale
4. **Modali stacked** — non coperti da smoke dedicato
5. **Fork PR senza gate** — contributor esterni senza CI signal
6. **Storage orphan parziale** — audit campione, non walk ricorsivo
7. **Edge RBAC vs user_permissions** — proxy non replica tutti i moduli
8. **Login rate limit Supabase** — utenti smoke dedicati obbligatori
9. **Polling fallback prolungato** — degradazione se realtime down extended
10. **Doc drift** — mitigato da hub ops-production-checklist

---

## 7. TOP 10 ERRORI DA EVITARE

1. Mettere `SUPABASE_SERVICE_ROLE_KEY` su Vercel Production
2. Attivare `NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS=1` in production
3. Bypass branch protection / merge senza `release-gate` verde
4. `vercel deploy --prod` manuale fuori policy
5. `queryClient.invalidateQueries` diretto su query gestionale
6. Modal shell custom fuori `GestionaleModalShell`
7. Migration distruttiva senza backup SQL
8. Lasciare `NEXT_PUBLIC_CAB_OPS_WARN=1` permanentemente in prod
9. Mix cleanup massivo + feature nella stessa PR
10. Ignorare FAIL CI attribuendoli a locale quando sono FAIL codice reali

---

## 8. COSA NON TOCCARE

| Componente | Motivo |
|------------|--------|
| Truth layer (`invalidateRuntimeTruth`, `invalidateOperationalTruth`) | Single source invalidation |
| Release gate workflow (`.github/workflows/release-gate.yml`) | Single deploy authority |
| `SyncTransportController` | Realtime/polling mutual exclusion |
| RBAC 4-level stack | RLS + truth + server + edge |
| Modal scroll-lock (`useBodyScrollLock`) | Mobile stability |
| `GestionaleListTable` design tokens | UX consistency dense lists |
| Gate-first Vercel model (build only) | Evita duplicazione controlli |
| Fatal aggregator + degradation detector | Storm detection |

---

## 9. COSA PUÒ EVOLVERE SICURAMENTE

| Area | Esempi |
|------|--------|
| Documentazione ops | Checklist, runbook, governance |
| Env templates | `.env.production.example`, `.env.smoke.example` |
| Regression tsx | Matrice RBAC, truth invalidation, KPI |
| Observability catalog | Nuovi eventi in `events.ts` + doc |
| Smoke Playwright | Seed documenti, operator RBAC |
| `ops:diagnostics` | Pre-release major (advisory) |
| Deprecated cleanup | Batch piccoli, 0 call site, gate verde |
| Production readiness UI | Informativo, no deploy authority |

---

## 10. ROADMAP TECNICA — PROSSIMI 3 MESI

### Mese 1 — Rollout reale

- [ ] Configurare secrets GitHub Actions completi
- [ ] Branch protection + Vercel Deployment Protection
- [ ] Rollout fase pilot ([rollout-checklist.md](./checklists/rollout-checklist.md))
- [ ] Post-deploy checklist su ogni release

### Mese 2 — Hardening operativo

- [ ] Abilitare PITR Supabase + documentare restore
- [ ] Smoke operator + `SMOKE_DOCUMENTI_LAVORAZIONE_ID` in CI
- [ ] `ops:diagnostics` pre-release major
- [ ] Audit trimestrale env Vercel

### Mese 3 — Manutenzione controllata

- [ ] Batch deprecated cleanup (max 1 area/PR)
- [ ] Valutare smoke stacked modals (solo se necessario)
- [ ] Review pilot flags residue
- [ ] Aggiornare PLATFORM_STATUS_REPORT

---

## Gate Results — Real vs Env FAIL

**Ambiente:** locale Windows, **senza** `SUPABASE_*`, **senza** `SMOKE_*`  
**Data esecuzione:** 2026-05-29

| Comando | Esito | Tipo |
|---------|-------|------|
| `npm run ci:tsc` | **PASS** | — |
| `npm run ci:build` | **PASS** | — |
| `npm run ux:enforce` | **PASS** | — |
| `npm run ux:mobile-gate` | **PASS** (14 warnings euristici, score 44) | — |
| `npm run smoke:structural` | **PASS** | — |
| `npm run smoke:regression` | **PASS** | — |
| `npm run production:check` (default) | **PASS** | — |
| `npm run production:check` + `PRODUCTION_CHECK_REQUIRE_DB=1` | **FAIL** | **ENV** — DB non connesso, `feature-flag-db-not-checked` |
| `npm run ops:diagnostics` | **PASS** advisory | warning **ENV** — storage diag saltata |
| `npm run release:gate` | **FAIL** step 5 | **ENV** — stesso blocker DB + smoke creds assenti |
| `npm run smoke:playwright` | Non eseguito | **ENV** — `SMOKE_*` assenti |

### Interpretazione

- **FAIL reali codice:** nessuno rilevato in questa passata
- **FAIL env/secrets:** `production:check` con DB, `release:gate` (imposta `PRODUCTION_CHECK_REQUIRE_DB=1`), Playwright
- **In CI GitHub con secrets configurati:** atteso PASS completo su tutti gli 8 step

---

## Documentazione governance (2026-05-29)

| Documento | Fase |
|-----------|------|
| [checklists/rollout-checklist.md](./checklists/rollout-checklist.md) | Fase 1 |
| [checklists/pre-deploy-checklist.md](./checklists/pre-deploy-checklist.md) | Fase 1 |
| [checklists/post-deploy-checklist.md](./checklists/post-deploy-checklist.md) | Fase 1 |
| [checklists/rollback-checklist.md](./checklists/rollback-checklist.md) | Fase 1 |
| [checklists/incident-checklist.md](./checklists/incident-checklist.md) | Fase 1 |
| [observability-ops.md](./observability-ops.md) | Fase 2 |
| [feature-evolution-rules.md](./feature-evolution-rules.md) | Fase 3 |
| [maintenance-governance.md](./maintenance-governance.md) | Fase 4 |
| `.env.production.example`, `.env.smoke.example` | Fase 1 |

---

## Riferimenti

- [ops-production-checklist.md](./ops-production-checklist.md)
- [release-gate.md](./release-gate.md)
- [RELEASE_READINESS_AUDIT.md](./RELEASE_READINESS_AUDIT.md)
- [OPERATIONAL_READINESS_AUDIT.md](./OPERATIONAL_READINESS_AUDIT.md)
