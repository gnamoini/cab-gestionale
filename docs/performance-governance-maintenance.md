# Performance Governance — Piano di manutenzione

## Ogni Pull Request (blocking)

| Controllo | Comando / workflow |
|-----------|-------------------|
| TypeScript | `ci:tsc` |
| ESLint + cab-perf | `lint` |
| Build + bundle budget | `ci:build` → `ops:build-budget-gate` |
| Perf policy suite | `runtime.performance.policy` via `control:pr` |
| RBAC / design gates | Control Plane PR tier |

## Giornaliero (sviluppo)

- Dev con `NEXT_PUBLIC_PERF_DIAGNOSTICS=1` per overlay opzionale
- Dopo modifiche performance-sensitive: `npm run ops:build-budget-gate`

## Settimanale / pre-release (cert)

| Controllo | Comando |
|-----------|---------|
| Performance snapshot | `npm run ops:performance-snapshot` |
| Regression check | `npm run ops:performance-regression-check` |
| Lighthouse budget | `npm run ops:lighthouse-budget` |
| Soak threshold | `npm run ops:long-session-soak:threshold` |
| Trend report | `npm run ops:performance-trend-report` |

## Nightly

- `e2e/perf` stress (CPU throttle + Slow 3G)
- `ops:long-session-soak` full
- Artifact: `performance-trends/latest.json`

## Aggiornamento baseline intenzionale

Dopo ottimizzazione approvata:

```bash
npm run ops:performance-snapshot
# copiare performance-snapshot.json → performance-snapshot-baseline.json
npm run ops:build-budget-gate
```

Documentare in PR il delta e la motivazione.

## Owner

Platform — registry e script ops.  
Frontend — perf-policy per pagina.
