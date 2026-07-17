# Performance Regression Guard

Sistema di guardia contro regressioni performance — misura e confronto, senza modifiche UX o business logic.

**Governance v6:** vedi [performance-governance-v6-budget.md](./performance-governance-v6-budget.md) e [ADR-004](./adr/ADR-004-performance-governance.md).

## Componenti

| Asset | Ruolo |
|-------|--------|
| [`lib/performance/performance-budget-registry.ts`](../lib/performance/performance-budget-registry.ts) | Budget SSOT per route (payload, query, server ms, v6 JS) |
| [`lib/performance/performance-global-budgets.ts`](../lib/performance/performance-global-budgets.ts) | Ceiling globali bundle / Web Vitals |
| [`scripts/ops/extract-build-budgets.mjs`](../scripts/ops/extract-build-budgets.mjs) | Estrazione JS post-build (PR gate) |
| [`scripts/ops/performance-snapshot.mjs`](../scripts/ops/performance-snapshot.mjs) | Snapshot metriche correnti |
| [`scripts/ops/performance-regression-check.mjs`](../scripts/ops/performance-regression-check.mjs) | Diff vs baseline (WARNING 10%, FAIL 20%) |
| [`scripts/ops/slow-query-audit.mjs`](../scripts/ops/slow-query-audit.mjs) | Osservatorio query DB (complementare) |
| [`lib/observability/react-render-audit.ts`](../lib/observability/react-render-audit.ts) | Render counter dev-only |
| [`scripts/ops/query-frequency-audit.mjs`](../scripts/ops/query-frequency-audit.mjs) | Classificazione fetch duplicate |

## Workflow

### 1. Baseline (una tantum o dopo ottimizzazione intenzionale)

```bash
npm run ops:slow-query-audit          # opzionale — DB audit
npm run ops:performance-snapshot      # crea performance-snapshot-baseline.json
```

### 2. Dopo modifiche performance-sensitive

```bash
npm run ops:performance-regression-check
```

- Output: `test-results/performance-regression-diff.json`
- Report: `docs/performance-regression-report.md`
- **Exit code 1** se FAIL (>20% vs baseline o superamento hard budget)

### 3. Dev — render e query frequency

```bash
set NEXT_PUBLIC_RENDER_AUDIT=1
npm run dev
# Console: JSON.stringify(window.__cabRenderAudit())
# Salvare in test-results/render-audit-export.json

node scripts/ops/react-render-audit.mjs test-results/render-audit-export.json
node scripts/ops/query-frequency-audit.mjs test-results/cache-fetch-counts.json
```

## Soglie

| Metrica | WARNING | FAIL |
|---------|---------|------|
| payloadKb | +10% | +20% |
| queryCount | +10% | +20% |
| serverExecutionMs | +10% | +20% |
| bundleKb | +10% | +20% |

Hard ceiling: valori in `PERFORMANCE_BUDGETS` — superamento = FAIL anche senza baseline.

## CI

| Tier | Controlli |
|------|-----------|
| **PR** | `runtime.performance.policy`, `ops:build-budget-gate`, ESLint cab-perf |
| **Cert** | `ops:performance-regression-check`, `ops:lighthouse-budget`, soak threshold |
| **Nightly** | Playwright perf stress, trend report |

- Test statici: `lib/regression/performance-budget-registry.test.ts`, `lib/regression/performance-regression-guard.test.ts`, `lib/control/suites/performance-governance.suite.ts`
- Gate runtime: `ops:performance-regression-check` — cert / post-deploy (richiede credenziali Supabase)
- Gate bundle: `ops:build-budget-gate` — dopo `ci:build` su PR

## Riferimenti

- [slow-query-audit.md](./slow-query-audit.md)
- [post-deploy-checklist.md](./checklists/post-deploy-checklist.md)
