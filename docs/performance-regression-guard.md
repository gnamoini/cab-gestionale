# Performance Regression Guard

Sistema di guardia contro regressioni performance — misura e confronto, senza modifiche UX o business logic.

## Componenti

| Asset | Ruolo |
|-------|--------|
| [`lib/performance/performance-budget-registry.ts`](../lib/performance/performance-budget-registry.ts) | Budget SSOT per route (payload, query count, server ms) |
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

- Test statici: `lib/regression/performance-budget-registry.test.ts`, `lib/regression/performance-regression-guard.test.ts` (extended tier)
- Gate runtime: `ops:performance-regression-check` — post-deploy / workflow_dispatch (richiede `.env.local` + Supabase linked)

## Riferimenti

- [slow-query-audit.md](./slow-query-audit.md)
- [post-deploy-checklist.md](./checklists/post-deploy-checklist.md)
