# Performance Dashboard — Design (v6)

**Scope v6:** artifact CI e report Markdown. **Nessuna UI in-app** in produzione.

## Obiettivo

Visualizzare trend nel tempo per prevenire regressioni silenti.

## Fonti dati

| Artifact | Path |
|----------|------|
| Build budget | `test-results/build-budget-snapshot.json` |
| Runtime snapshot | `test-results/performance-snapshot.json` |
| Regression diff | `test-results/performance-regression-diff.json` |
| Lighthouse | `test-results/lighthouse-snapshot.json` |
| Score aggregato | `test-results/performance-trends/latest.json` |
| Storico | `test-results/performance-trends/history.jsonl` |

## Pannelli (report MD / future UI)

1. **Bundle** — firstLoadJsKb, vendorChunkKb, per-route jsKb trend
2. **Network/DB** — payloadKb, queryCount, serverExecutionMs per route
3. **Rendering** — hydrationMs, render audit top offenders
4. **Cache** — cacheHitRatio, duplicate query count
5. **Web Vitals** — LCP, INP, CLS, TTFB vs budget
6. **Score** — 0–100 composito (`lib/performance/performance-score.ts`)
7. **Regressioni** — FAIL/WARN ultimo run

## Generazione

```bash
npm run ops:performance-trend-report
```

Output: `docs/performance-governance-report.md` + `test-results/performance-trends/latest.json`

## CI artifact

Upload in `control-cert.yml` e `release-gate-nightly.yml`:

- `test-results/performance-trends/**`
- `test-results/build-budget-*.json`
- `docs/performance-governance-report.md`

## Future UI (v7+)

Pagina admin `/sicurezza` o Control Plane locale che legge artifact da API interna — fuori scope v6 per vincolo zero UX prod.
