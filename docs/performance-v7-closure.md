# Performance Hardening v7 — Final Audit & Production Closure

**Date:** 2026-07-17  
**Scope:** Chiusura audit v1–v6, fix misurazione/CI, certificazione production readiness  
**Verdict:** **Production Ready con residui minori**

---

## 1. Executive Summary

Il programma Performance Hardening (v1–v6) è **completo e verificato**. La governance permanente è attiva su PR tramite Control Plane (`runtime.performance.policy`, `runtime.performance.build-budget`, `runtime.performance.lint`) e suite statica `PERFORMANCE_GOVERNANCE_SUITE` (21 test, incluso closure audit v7).

**v7** ha chiuso i gap di misurazione e CI emersi in v6:

- `queryCount` nello snapshot deriva da REST benchmark / scope keys (non più da `budget.maxQueries`)
- Baseline e report governance rigenerati con budget calibrati (`/report` 48 KB, `/mezzi` 32 KB)
- Regression guard: **0 failures**
- Build budget: **1793.6 KB** first load / **443.3 KB** vendor (sotto ceiling 1900/800)
- Score governance: **100/100** (artifact-driven; v6 static score ~95 con input parziali)

Nessuna modifica UX, API, schema DB o RBAC in v7.

---

## 2. Ottimizzazioni aggiuntive v7

| Intervento | File | Motivazione | Beneficio |
|------------|------|-------------|-----------|
| Closure audit statico | `lib/regression/performance-closure-audit.test.ts` | Verifica presenza reale interventi v1–v6 senza re-misurazione runtime | Regression guard su drift documentazione/implementazione |
| Orchestratore chiusura | `scripts/ops/performance-closure-verify.mjs`, `ops:performance-closure-verify` | One-shot per cert locale/CI | Exit 1 se qualsiasi gate performance fallisce |
| Fix `queryCount` + campi aggregati | `scripts/ops/performance-snapshot.mjs` | v6 misurava ceiling invece del conteggio reale | Snapshot e baseline affidabili per trend |
| `duplicateQueries`, `websocketChannels`, `memoryMb` | `performance-snapshot.mjs` | Campi v6 parziali | Aggregazione null-safe da audit/query-frequency e realtime config |
| `vendorChunkKb`, `routeChunks` in snapshot | `performance-snapshot.mjs` | Bundle non tracciato in baseline | Confronto bundle per route nel trend |
| `--refresh-baseline` | `performance-snapshot.mjs` | Baseline datata con budget vecchi | Refresh deterministico post-build |
| Regression da diff JSON | `scripts/ops/performance-trend-report.mjs` | Report mostrava FAIL stale | `performance-governance-report.md` allineato a `failures=0` |
| Budget exceptions in build gate | `scripts/ops/extract-build-budgets.mjs`, `export-budget-exceptions.ts` | Eccezioni formali ignorate | Gate allineato a `performance-budget-exceptions.ts` |
| Governance in EXTENDED smoke | `lib/regression/smoke-regression-lists.ts` | Suite perf non in cert extended | Cert blocking via `smoke:regression:extended` |
| `runtime.performance.lint` | `lib/control/registry.ts` | Gap vs piano v6 | PR blocker su policy lint performance |
| Cert artifacts performance | `.github/workflows/control-cert.yml` | Trend non persistiti in cert | Upload `performance-trends/**`, snapshot, governance report |

---

## 3. Residui (tabella unificata v3/v5/v6)

| Residuo | Motivazione | Impatto operativo | Priorità | Soluzione futura |
|---------|-------------|-------------------|----------|------------------|
| Server pagination liste ERP (lavorazioni, magazzino, preventivi, documenti, fatturazione) | Cambio API + UX paginazione | Basso con dataset attuale (<100 righe/route); alto >10k | P1 | Cursor-based server pagination + policy test |
| Split monoliti view >1.4k LOC | Refactor architetturale multi-file | Manutenibilità, TTI su hardware datato | P1 | Island split per dominio (v5 backlog) |
| AppShell code-split globale | Shell condivisa da tutte le route | First load ~1.8 MB uncompressed | P2 | Lazy shell + route groups |
| Report BFF 6-wave → partial SSR | Prefetch architetturale | Payload `/report` 42/48 KB (vicino ceiling) | P2 | Wave reduction o SSR parziale KPI |
| Dashboard performance UI in-app | Design doc only (`performance-dashboard-design.md`) | Osservabilità solo CI/artifact | P3 | Fase post-cert se richiesto |
| Soak 4h / memory leak cert | `production-certification-final.md` — B condizionale | Long-session non certificata | P2 | Playwright soak + `memoryMb` in snapshot |
| ESLint zero warning globale | 10+ warning pre-esistenti in `src/services` | Nessun blocker performance | P3 | Cleanup separato da performance |
| Seq scan su dataset piccolo | EXPLAIN audit — indici ok su volume reale | Nessuno sotto soglia righe | P3 | Re-audit post-crescita dati |
| Linked DB unavailable in snapshot locale | Supabase linked 401 senza credenziali CLI | `serverExecutionMs` null in dev | Info | CI cert con env completo |
| Lighthouse Web Vitals in cert | `LIGHTHOUSE_BASE_URL` assente in run locale | Sezione "pending e2e/cert" nel report | Info | `ops:lighthouse-budget` in nightly/cert |

### Wave 2 — Scan residui implementabili (skip documentati)

| Area | Esito audit | Azione v7 |
|------|-------------|-----------|
| Sicurezza users table `virtualRows` | Tabella già paginata client-side | **Skip** |
| Portale archivio `virtualRows` | Ha `lsdPaginated` | **Skip** |
| Mezzi mobile cards virtualizzazione | Split view = scope architetturale | **Skip** |
| Report cold gate (`enableMezzi`/`enableMovimenti`) | **Presente** in `report-analytics-view.tsx` | **Nessun fix** |

---

## 4. Confronto finale (v1 → v7)

| Metrica | v1 (2026-06) | v7 (2026-07) | Fonte |
|---------|--------------|--------------|-------|
| First load JS | ~6.6 MB raw (boot baseline) | 1793.6 KB uncompressed route stats | `build-budget-snapshot.json` |
| Vendor chunk | n/a | 443.3 KB | `build-budget-snapshot.json` |
| Payload `/report` | n/a | 42.16 KB / max 48 KB | REST benchmark + budget registry |
| Payload `/mezzi` | n/a | 27.92 KB / max 32 KB | REST benchmark + budget registry |
| `queryCount` `/report` | n/a (non misurato) | 6 (reale da scope) | `performance-snapshot.json` |
| Governance CI | Policy manuale | PR blocker automatico (policy + build + lint) | Control Plane registry |
| Score categorie | v2 table (+12 RSC, +16 tabelle) | Governance score 100/100 (artifact) | `performance-governance-report.md` |
| Regression failures | n/a | **0** | `performance-regression-diff.json` |
| Policy tests | `performance-policy.test.ts` | 21 test governance suite + closure audit | `performance-governance.suite.ts` |

---

## 5. Production Readiness (0–100)

| Categoria | Score | Note |
|-----------|-------|------|
| Stabilità | 85 | Gate CI + RBAC; soak 4h non eseguito |
| Performance | 90 | Budget rispettato; `/report` payload al 88% del ceiling |
| Scalabilità | 70 | Full-list fetch residuo su liste ERP |
| Manutenibilità | 88 | Policy tests + ADR-004 + checklist v6 |
| Coerenza architetturale | 85 | Control plane, query ownership, prefetch SSOT |
| Robustezza | 82 | Regression guard cert tier; lighthouse pending locale |

**Media ponderata operativa:** ~85/100

---

## 6. Certificazione finale

### Quality gate v7 (eseguito 2026-07-17)

| Requisito | Esito |
|-----------|-------|
| `npm run ci:tsc` | **PASS** |
| `npm run build` + `ops:build-budget-gate` | **PASS** (1793.6 / 443.3 KB) |
| `performance-governance.suite.ts` (21 test) | **PASS** |
| `performance-closure-audit.test.ts` | **PASS** |
| `ops:performance-regression-check` | **PASS** (failures=0, warnings=0) |
| `ops:performance-trend-report` | **PASS** (score=100) |
| `npm run control:review` | **PASS** (46 controls) |
| `npm run control:parity` | **PASS** |
| ESLint zero warning globale | **Non richiesto** — fuori scope |
| Memory leak 4h | **Non richiesto** — residuo documentato |
| Zero TODO/FIXME in `components/gestionale/**` | **PASS** (grep audit) |

### Verdetto

**Production Ready con residui minori**

**Motivazione:**

- Tutti i gate performance automatici **PASS**
- Residui sono scalabilità dataset grande (server pagination) e osservabilità long-session — non blocker operativi quotidiani con volume dati attuale
- Nessuna regressione funzionale/UX introdotta in v7
- Governance permanente attiva: drift futuro bloccato su PR

### Comandi di ri-verifica

```bash
npm run ops:performance-closure-verify   # orchestratore completo (build + suite + snapshot + regression + trend)
npm run control:review
npm run control:parity
npx tsx lib/regression/performance-closure-audit.test.ts
```

---

## Riferimenti

- [performance-governance-report.md](./performance-governance-report.md) — report auto-generato
- [performance-regression-report.md](./performance-regression-report.md) — diff route-level
- [ADR-004](./adr/ADR-004-performance-governance.md) — architettura governance v6
- [performance-v5-summary.md](./performance-v5-summary.md) — programma page-local v5
- [dashboard-boot-baseline.md](./dashboard-boot-baseline.md) — baseline v1 (~6.6 MB)
