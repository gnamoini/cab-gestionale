# ADR-004: Performance Governance v6

**Status:** Accepted  
**Date:** 2026-07-17  
**Deciders:** Platform / Engineering  
**Supersedes:** informal v1–v5 perf docs only (non-breaking)

---

## Context

Dopo audit e ottimizzazioni v1–v5 il gestionale è performante, ma mancava governance permanente:

- `*-perf-policy.test.ts` non in CI PR tier
- `bundleKb` null negli snapshot
- `runtime.performance.regression` solo observe/warning
- Nessun budget JS post-build automatizzato

Le performance devono essere requisito di qualità come TypeScript, ESLint e RBAC.

---

## Decision

### 1. SSOT budget esteso

- [`lib/performance/performance-budget-registry.ts`](../lib/performance/performance-budget-registry.ts) — route budgets + campi v6 opzionali
- [`lib/performance/performance-global-budgets.ts`](../lib/performance/performance-global-budgets.ts) — ceiling globali
- [`lib/performance/performance-budget-exceptions.ts`](../lib/performance/performance-budget-exceptions.ts) — eccezioni temporanee

### 2. Tier CI

| Tier | Blocking |
|------|----------|
| **PR** | perf-policy suite, ESLint cab-perf, `ops:build-budget-gate` (post build) |
| **Cert** | `ops:performance-regression-check`, `ops:lighthouse-budget`, soak threshold |
| **Nightly** | Playwright perf stress, trend report, soak full |

Runtime REST/DB **non** blocking su PR (flaky senza credenziali stabili); promosso a cert.

### 3. Bundle measurement Next 16

Next 16 + Turbopack non stampa tabella First Load JS in stdout. Fonte autoritativa: `.next/diagnostics/route-bundle-stats.json` (`firstLoadUncompressedJsBytes`).

ponytail: valori non compressi — il wire gzip è minore; tolleranza ±5% documentata.

### 4. Zero overhead produzione

- Diagnostica solo `NODE_ENV=development` + env flag
- Nessun provider runtime aggiuntivo in prod
- Score/report = artifact CI, non UI gestionale

### 5. Eccezioni budget

Label `perf-budget-exception` + entry scaduta in `performance-budget-exceptions.ts` + bump registry con commento approvazione.

---

## Consequences

- PR più lenta di ~30–60s (estrazione manifest post-build)
- Sviluppatori devono consultare checklist feature e ADR prima di feature pesanti
- Dashboard trend = artifact JSON/MD in CI (UI in-app fuori scope v6)

---

## Riferimenti

- [performance-governance-v6-budget.md](../performance-governance-v6-budget.md)
- [performance-governance-maintenance.md](../performance-governance-maintenance.md)
- [ADR-001](./ADR-001-control-plane-architecture.md)
