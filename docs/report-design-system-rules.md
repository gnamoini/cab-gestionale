# Report Design System — Regole operative v3.3 (FROZEN)

> Governance architetturale per la pagina Report. Le sezioni compongono; il design system decide presentazione.

## Architettura

```
Builder → Adapter → ReportMetric → ReportMetricRenderer → REPORT_RENDERERS → Primitive → Section
```

**Direzione import obbligatoria:**

```
sections ──→ design-system/index.ts ONLY

primitives ──→ internal ──→ tokens

MAI: sections → tokens | sections → primitives | sections → internal
```

## Anti-pattern vietati

| Anti-pattern | Perché |
|--------------|--------|
| KPI custom in sezione | Duplica formatter, confronto, trust |
| Tabella custom con colonne inline | Rompe SSOT colonne e sort |
| Chart dominio (`EconomicChart`, …) | Naming e layout non governati |
| `grid-cols-*` in sezioni | Layout KPI è di `ReportMetricGrid` |
| `formatCurrency` / `toLocaleString` su KPI | Formatter solo via registry |
| Colori business arbitrari (`bg-red-100`, `tone` locale) | Policy semantica centralizzata |
| Magic numbers visivi (`chartHeight=260`) | Solo `visual-density` |

## Ownership

| Oggetto | Owner | Vietato altrove |
|---------|-------|-----------------|
| KPI layout | `ReportMetricGrid` | `grid-cols-*` in sections |
| KPI rendering | `ReportMetricRenderer` → `REPORT_RENDERERS` | `MetricCard`, chart atomici diretti |
| Formattazione valore | `ReportValueFormatter` + `formatReportMetricValue` | formatter sparsi in `components/report/**` |
| Colori | `semantic-colors-policy` + `use-semantic-color` | classi colore arbitrarie |
| Spacing/dimensioni | `visual-density` via `use-report-density` | padding/gap/height locali in primitive |
| Testo | `ReportTypography` / `ReportNarrativeBlock` | `text-sm` arbitrario |
| Colonne tabella | `lib/report/design-system/table-configs/*.ts` | `columns={[...]}` inline |
| Tooltip/assi chart | `ReportChartConfig` | formatter nei dati grezzi |
| Trend colore | policy `metricTrend` | `showTrendColor` su card |
| Stato badge | `StatusBadge` + policy `status` | span con classi stato ad hoc |

**Regola:** nessun componente possiede decisioni di un altro layer.

## Composition API (sections)

Consentiti da `components/report/design-system/index.ts`:

- `ReportSection`, `ReportSectionHeader`
- `ReportMetricGrid`, `ReportMetricRenderer`
- `ReportDataTable` (solo `configId` + `rows`)
- `ReportLineChart`, `ReportBarChart`, `ReportMatrix`
- `ReportNarrativeBlock`, `StatusBadge`
- `ReportEmbeddedModule`, `ReportVisualization`

Vietati in `sections/**`: import da `primitives/`, `internal/`, `tokens/`, `MetricCard`.

## Migrazione

| Fase | Sezioni | Enforcement |
|------|---------|-------------|
| Sprint 3.5 | Lavorazioni (pilota) | coverage strict per lavorazioni |
| Sprint 5 | Resto | coverage strict globale, legacy eliminati |

Allowlist temporanea: `COVERAGE_MIGRATION_ALLOWLIST` in `section-primitive-contract.ts`.
