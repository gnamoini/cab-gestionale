# Performance Governance v6 — Rules

Elenco regole automatiche introdotte in v6.

## Static policy tests (`lib/regression/*-perf-policy.test.ts`)

| Suite | Scope |
|-------|--------|
| `performance-policy.test.ts` | Core: dynamic splits, PDF lazy, virtualRows, query stale, SELECT * services |
| `performance-budget-registry.test.ts` | SSOT budget shape + scope parity |
| `performance-regression-guard.test.ts` | Ops scripts + report sections |
| `performance-lint-policy.test.ts` | ESLint cab-perf registration |
| `*-perf-policy.test.ts` (15) | Page-local invariants post v3/v5 |
| `shared-components-perf-policy.test.ts` | Shared components v4 |

## ESLint `cab-perf`

| Rule | Files | Severity |
|------|-------|----------|
| `no-select-star` | `src/services/**/*.service.ts` | error |
| `no-heavy-import-in-client` | `**/*.{ts,tsx}` with `use client` | error |
| `no-ssr-false-prefetched-route` | `components/gestionale/report/*.tsx` | error |
| `no-img-without-next-image` | `components/gestionale/**` | warn |

## Build gate

| Script | Gate |
|--------|------|
| `scripts/ops/extract-build-budgets.mjs --gate` | firstLoadJsKb, vendorChunkKb, per-route maxFirstLoadJsKb |
| `npm run ops:build-budget-gate` | PR blocking (post `ci:build`) |

## Runtime ops (cert/nightly)

| Script | Metriche |
|--------|----------|
| `ops:performance-snapshot` | payload, query, hydration, bundle, cache |
| `ops:performance-regression-check` | diff 10%/20% vs baseline |
| `ops:lighthouse-budget` | LCP, INP, CLS, TTFB |
| `e2e/perf/browser-page-profile.spec.ts` | navigation, REST waterfall, stress throttle |
| `ops:long-session-soak` | RAM creep |
| `ops:query-frequency-audit` | duplicate fetches |
| `ops:react-render-audit` | render count dev export |

## Dev diagnostics

| Env | Componente |
|-----|------------|
| `NEXT_PUBLIC_PERF_DIAGNOSTICS=1` | `performance-diagnostics-overlay.tsx` |
| `NEXT_PUBLIC_RENDER_AUDIT=1` | `react-render-audit.ts` |

## Control Plane IDs

- `runtime.performance.policy` — PR
- `runtime.performance.build-budget` — PR
- `runtime.performance.regression` — cert
- `runtime.performance.lighthouse` — cert
- `runtime.performance.browser-profile` — nightly
