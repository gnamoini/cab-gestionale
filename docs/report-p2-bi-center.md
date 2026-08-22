# Report P2 — Business Intelligence Center

UI/UX refactor of `/report` on top of the P1 Analytics Engine. Presentation-only: no new business formulas or Supabase queries in BI widgets.

## Information architecture

```
Toolbar (unchanged semantics)
Executive Overview → /api/report/executive + analytics enrichment
Insight & Alerts → /api/report/insights
Primary Trend → analytics series
Analysis areas (Economia, Lavorazioni, Preventivi, Magazzino, Clienti, Risorse)
Historical Trend (local 12w/12m — does NOT change ReportPeriodContext)
Events & Context (diary + insights)
Legacy collapsible sections (deep charts, demoted)
```

## Data pipeline

```text
ReportPeriodContext
  → ReportAnalyticsProvider (union metricIds → single /api/report/analytics)
  → envelopesById / series / dimensions
  → ReportMetricEnvelopeCard / ReportTrendChart / Pareto
```

Executive cards: `/api/report/executive` for values; same provider supplies compare/sparkline envelopes.

## PerformanceGate rule

During P2 migration, `ReportPerformanceGate` remains only for non-migrated operational metrics (e.g. backlog alerts). It must **not** repeat Executive Overview KPIs. LAVORAZIONI duplicate hero KPI grid removed.

## Primary Trend eligibility

Metrics appear in the selector only when `supportsSeries`, granularity, temporal semantics, and trust are acceptable (`resolve-series-eligible-metrics.ts`).

## Clienti Pareto

Uses engine `dimensions=cliente` on `eco_fatturato` for the **global toolbar period** — no client-side invoice aggregation.

## Historical Trend

Local window state (12 weeks / 12 months). Toolbar period unchanged.

## Migration status

| Area | Engine | Legacy depth |
|------|--------|--------------|
| Executive | Yes | — |
| BI KPI sections | Yes | — |
| Primary / Historical trend | Yes | — |
| Clienti Pareto | Yes | — |
| Legacy section charts | Partial | Collapsible sections below |

## Deferred (P3+)

Drill-down routes, AI automation, `quote_conversion_pct`, full dimension model, margin waterfall unless engine steps exist.

See also: [report-p1-analytics-engine.md](./report-p1-analytics-engine.md), [report-p0-architecture.md](./report-p0-architecture.md).
