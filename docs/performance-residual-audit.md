# Production Readiness — Residual Audit & Gap Closure

**Date:** 2026-07-17  
**Scope:** Valutazione finale residui post-v7; implementazione solo fix sicuri  
**Verdict:** **Production Ready con residui pianificati**

---

## 1. Residual Audit

### Decision Matrix

| Residuo | Necessario ora | Beneficio | Rischio | Azione |
|---------|----------------|-----------|---------|--------|
| Server pagination (mezzi, magazzino, documenti, fatturazione, report) | No | Alto a >10k righe | Alto (API + UX + filtri client) | **RIMANDARE** — P1 |
| Server pagination lavorazioni (RPC esistente, flag preview) | No | Medio | Medio | **RIMANDARE** — validare in preview |
| Monolith splits (lavorazioni-view ~2517 LOC, magazzino-view ~2164 LOC) | No | Manutenibilità / TTI | Alto | **RIMANDARE** — già parzialmente split via `dynamic()` |
| AppShell code-split globale | No | Medio (~1.8 MB first load) | Alto | **RIMANDARE** — P2 |
| Report BFF → partial SSR | No | Medio (payload 42/48 KB) | Alto (KPI correctness) | **RIMANDARE** — monitorare trend CI |
| 4h soak test | No | Certificazione long-session | N/A | **RIMANDARE** — P2 cert |
| In-app performance dashboard | No | Basso | Medio | **NON NECESSARIO** |
| ESLint zero warning globale | No | Basso | Medio | **NON NECESSARIO** |
| `clientToastSeenRef` unbounded Set | **Sì** | RAM long-session | Basso | **IMPLEMENTATO** |
| Dashboard debounce timer senza cleanup | **Sì** | Invalidate post-unmount | Basso | **IMPLEMENTATO** |
| `global-select` blurTimer senza unmount cleanup | No | Basso (120ms) | Medio (file critico) | **RIMANDARE** |

### Server pagination per dominio

| Dominio | Pattern | Record stimato | Crescita | Rischio perf | Server pag senza UX change? |
|---------|---------|----------------|----------|--------------|----------------------------|
| Lavorazioni | Hybrid: full-list + RPC cursor (flag) | Basso–medio | Alta | Med–alto | Parziale — RPC già in preview |
| Mezzi | Full fetch + client pag + virtualRows | Medio (~80 bench) | Media | Med–alto | No — filtri client-side |
| Magazzino | Full fetch + client pag + virtualRows | Basso (~17 bench) | Media | Alto | No — filtri derivati client |
| Documenti | Full fetch + tree pag marca | Basso | Bassa | Med | No — tree in-memory |
| Fatturazione | Full bundle + client pag | Basso | Media | Med | Parziale — solo lista, non bundle |
| Guasti | Aggregati report | N/A | N/A | Basso | N/A |
| Audit/log | Capped server (100 righe) | Basso | Bassa | Basso | Già bounded |
| Import AI | Full snapshot per dedup | Medio in preview | Bassa | Med | No — workflow-bound |
| Report tabelle | Full scan KPI + pag derivata | Alto (by design) | Alta | Alto | No — richiede SQL aggregates |

**Conclusione:** con volume dati attuale (<100 righe/route in REST benchmark), server pagination non è blocker operativo. Infrastruttura pronta solo per lavorazioni (`use-lavorazioni-list-v2`, `list_lavorazioni_paginated`).

### Monolith splits

| File | LOC | Split esistente | Split sicuro ora? |
|------|-----|-----------------|-------------------|
| `lavorazioni-view.tsx` | ~2517 | Dynamic modals, toolbar, kanban, table row | No |
| `magazzino-view.tsx` | ~2164 | Dynamic modals, log feed hook | No |
| `preventivi-view.tsx` | ~1358 | Dynamic editor/DDT/log | No |
| Report orchestrator | ~405 | Sezioni in `components/report/sections/` | Già fatto |

### Soak / memory (audit statico, test non eseguito)

| Pattern | Stato pre-fix | Stato post-fix |
|---------|---------------|----------------|
| Realtime bridge cleanup | OK | OK |
| Inbox coordinator seenIds TTL 5min | OK | OK |
| cab-sync handler ref | OK | OK |
| Magazzino log cap 100 | OK | OK |
| Schede storage TTL + max | OK | OK |
| `clientToastSeenRef` Set illimitato | **GAP** | **Fix** — Map + TTL 5min |
| Dashboard debounce timer | **GAP** | **Fix** — unmount cleanup |

### In-app performance dashboard

Strumenti esistenti sufficienti:

- Dev: `performance-diagnostics-overlay.tsx` (`NEXT_PUBLIC_PERF_DIAGNOSTICS=1`)
- CI: `performance-governance-report.md`, artifact cert workflow
- Design: `performance-dashboard-design.md` — esplicitamente CI-only

**Verdict:** non implementare UI prod.

---

## 2. Modifiche implementate

### Fix 1 — Toast seen TTL

| Campo | Dettaglio |
|-------|-----------|
| **File** | `components/gestionale/notification-center-bell.tsx` |
| **Motivo** | `clientToastSeenRef` era `Set<string>` senza prune — crescita RAM illimitata in sessioni lunghe con notifiche client portal |
| **Beneficio** | Stesso comportamento toast; memoria bounded (TTL 5min, allineato a `realtime-inbox-coordinator`) |
| **Rischio** | Basso — nessun cambio UX/API/RBAC |
| **Risultato** | `Map<string, number>` + `pruneClientToastSeen` + `CLIENT_TOAST_SEEN_TTL_MS` |

### Fix 2 — Dashboard sync timer cleanup

| Campo | Dettaglio |
|-------|-----------|
| **File** | `src/hooks/view/use-dashboard-sync-invalidation.ts` |
| **Motivo** | Debounce timer (`magDebounceRef`, `activityDebounceRef`) senza cleanup su unmount |
| **Beneficio** | Evita `invalidateQueries` / `invalidateOperationalTruth` dopo smontaggio dashboard |
| **Rischio** | Basso — solo `clearTimeout` in `useEffect` cleanup |
| **Risultato** | Cleanup unmount aggiunto |

### Fix 3 — Policy guards

| Campo | Dettaglio |
|-------|-----------|
| **File** | `lib/regression/long-session-stability-policy.test.ts` |
| **Motivo** | Prevenire regressione sui 2 fix memory |
| **Beneficio** | Guard statico in CI extended |
| **Rischio** | Nessuno |
| **Risultato** | Assert su TTL toast + unmount cleanup; aggiornato assert `gcTime` → `PWA_QUERY_CLIENT_DEFAULTS.gcTime` (drift pre-esistente) |

---

## 3. Elementi rimandati

| Elemento | Motivazione | Quando affrontare | Impatto se rimandato |
|----------|-------------|-------------------|----------------------|
| Server pagination ERP | Filtri/sort client-side; cambio API+UX | Dataset >10k righe o FAIL regression payload | RAM e TTI su hardware datato |
| Lavorazioni RPC in prod | Flag preview; filtri estesi forzano legacy | Dopo validazione preview completa | Full-list fetch in prod |
| Monolith view splits | Accoppiamento stato/handlers | Sprint manutenibilità dedicato | LOC debt, TTI marginale |
| AppShell code-split | Refactor architetturale | P2 post-rilascio | First load ~1.8 MB uncompressed |
| Report partial SSR | KPI correctness | Payload `/report` >48 KB in CI | Possibile eccezione budget |
| Soak 4h | Richiede infrastruttura cert | P2 certificazione | Long-session non certificata |
| Dashboard in-app | Duplica CI artifacts | Solo se richiesto da ops | Nessuno |
| global-select blurTimer cleanup | Beneficio marginale vs rischio file critico | Se emerge da profiling | Trascurabile |

---

## 4. Stato finale

### Verdict: **Production Ready con residui pianificati**

**Motivazione tecnica:**

- Tutti i gate v7 restano PASS (TypeScript, closure audit, build budget 1793.6/443.3 KB, regression failures=0)
- 2 gap memory leak certi chiusi senza rischio architetturale
- Nessuna modifica UX, workflow, RBAC, API pubblica o schema DB
- Residui P1/P2 documentati con trigger di attivazione (crescita dataset, degradazione CI)

### Validazioni eseguite (2026-07-17)

| Gate | Esito |
|------|-------|
| `npm run ci:tsc` | PASS |
| `long-session-stability-policy.test.ts` | PASS |
| `performance-closure-audit.test.ts` | PASS |
| `ops:build-budget-gate` | PASS (1793.6 KB / 443.3 KB) |

### Riferimenti

- [performance-v7-closure.md](./performance-v7-closure.md) — certificazione precedente
- [performance-governance-report.md](./performance-governance-report.md) — score CI
- [performance-v5-summary.md](./performance-v5-summary.md) — programma page-local v5
