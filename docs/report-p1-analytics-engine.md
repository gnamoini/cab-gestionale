# Report P1 — Analytics Engine

Server-side canonical calculation path for Report BI metrics. Reuses P0 envelopes, compare semantics, schede scopes, and existing BFF loaders without duplicating DB fetch logic.

## Layout

| Path | Role |
|------|------|
| `engine-metric-manifest.ts` | SSOT: metric → calculator + minimal source slices + explicit `supportsCompare` / `supportsSeries` |
| `resolve-analytics-data-requirements.ts` | Union of manifest flags for requested `metricIds` |
| `load-source-bundle.ts` | Single `loadAnalyticsSourceBundle` — `loadBaseSlices` + conditional enrich |
| `calculators/` | Canonical formulas (legacy dataset builders delegate here over time) |
| `build-report-analytics.ts` | Orchestrator → `ReportMetricEnvelope[]` |
| `api/report-analytics-api.ts` | `GET /api/report/analytics` |
| `adapters/to-executive-slices.ts` | Engine → Executive pilot |

## Minimal loader gate

`requested metricIds → ENGINE_METRIC_MANIFEST → resolveAnalyticsDataRequirements() → loadAnalyticsSourceBundle`.

Example: `eco_fatturato` alone loads invoices + payments only — not timesheet, schede, or preventivi-only paths unless another metric requires them.

## Executive pilot (E2E)

`/api/report/executive` uses `buildExecutiveAnalytics` → envelopes → `buildReportExecutiveDtoFromSlices`. Legacy dataset builders remain for other consumers until migrated.

## Parity chain (P1)

1. **SOURCE** — bundle slices match requirements flags  
2. **CALCULATOR** — engine vs legacy dataset row values (fixtures)  
3. **ENVELOPE** — P0 envelope builder  
4. **EXECUTIVE DTO** — slice adapter → cards  

## Consumer import rule

New code for migrated metrics must use `lib/report/analytics-engine` or `calculators/*`, not direct legacy formula imports. Enforced by `consumer-import-gate.test.ts`.

## Deferred (P2+)

- `quote_conversion_pct` (blocked — no canonical conversion event)  
- Full dimension model (`fornitore`, `categoria_ricambio`, `tecnico`) if new queries required  
- Cron materialized snapshots  

## API

```
GET /api/report/analytics?metrics=eco_fatturato,lav-chiusi&preset=questo_mese&compareMode=prev_period
```

Optional: `granularity=day|week|month`, `includeSeries=true`, `dimensions=cliente`.

Unknown or blocked metrics → `400` with `invalidIds`.
