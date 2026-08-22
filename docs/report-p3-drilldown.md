# Report P3 — Drill-down & Interactive Analysis

P3 adds interactive drill-down from BI Center KPIs, breakdowns, and insights to authorized paginated record lists — without new analytics formulas.

## Architecture

```
BI widget → ReportDrillDownContext → useReportDrillDown → Drawer
  → POST /api/report/drilldown → resolver → domain loaders → record route/modal
```

## Contract

- Client: [`components/report/bi-center/drill-down-context.ts`](../components/report/bi-center/drill-down-context.ts) (re-exports [`lib/report/drilldown/types.ts`](../lib/report/drilldown/types.ts))
- Server request: `ReportDrillDownRequest` with `metricId`, `period`, optional `dimension` / `dimensionValue` / `filters`, `cursor`, `pageSize`
- Registry: [`lib/report/drilldown/drilldown-metric-registry.ts`](../lib/report/drilldown/drilldown-metric-registry.ts)

Each metric declares:

| Field | Purpose |
|-------|---------|
| `aggregationKind` | `count` \| `sum` \| `snapshot` \| `ranking` \| `composite` |
| `drillDownKind` | `record_list` \| `composition_analysis` |
| `parityApplicable` | Whether record count should match envelope value |

**Parity rule:** automatic `totalEstimate === envelope.value` only when `parityApplicable: true` (count metrics). Sum/composite metrics show explicit `parityNote` in header.

## API

`GET/POST /api/report/drilldown`

- RBAC: `report` + module (`lavorazioni`, `fatturazione`, `magazzino`)
- Validation: [`validate-drilldown-request.server.ts`](../lib/report/drilldown/validate-drilldown-request.server.ts)
- Handler: [`run-drilldown.server.ts`](../lib/report/drilldown/run-drilldown.server.ts)

## Pagination

- Cursor-first via [`paginateSlice`](../lib/report/drilldown/paginate-slice.server.ts) (`{ offset }` keyset on filtered rows)
- Default `pageSize`: 25
- One primary request per user action (no N+1 list/detail)

## URL (optional)

Flat query params (period from toolbar context):

- `drillMetric`
- `drillDimension`
- `drillValue`

## Coverage matrix

| Source | Metric | Target | Status |
|--------|--------|--------|--------|
| KPI | `lav-chiusi` | lavorazioni | supported |
| KPI | `lav-aperti` | lavorazioni snapshot | supported |
| KPI | `lav-periodo` | lavorazioni ingresso | supported |
| KPI | `lav_late_sla` | lavorazioni SLA | supported |
| KPI | `eco_fatturato` | fatture | supported |
| KPI | `eco_incassato` | pagamenti | supported |
| KPI | `eco_da_incassare` | fatture aperte | supported |
| KPI | `eco_margine_operativo_stimato` | composition analysis | supported |
| KPI | `eco_preventivi` | preventivi | supported |
| KPI | `scorta` / `cap` / `ric-usati` | magazzino | supported |
| Clienti | `eco_fatturato` + `customerId` | fatture cliente | supported |
| Insight | `DrillDownRef.metricId` | resolver | supported |
| Trend point | sub-period | best-effort | partial |

## BLOCKED

- `quote_conversion_pct`
- Risorse per-tecnico/giorno → P3.1
- Diary notes without entity ref

## P4 readiness

Drill-down context + authorized lists can feed AI Business Report and Ask Report without recomputing metrics.
