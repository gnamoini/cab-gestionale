# Report Legacy Chart Consolidation — Completion Report

## §1 Baseline (pre-gate)

- `ci:tsc`: run at phase start
- `build`: run at phase start
- Suites: `governance.report.data-completion`, `governance.report.legacy-consolidation`
- E2E: `report-legacy-consolidation.spec.ts`, `report-advanced-bi.spec.ts`

## §2 Chart matrix

SSOT: `lib/report/legacy/legacy-chart-migration-matrix.ts` — 40+ entries with BLOCKED metadata.

## §3 Wave A migrations

| Panel | SSOT | Engine metrics |
|-------|------|----------------|
| `ReportLavorazioniChartsPanel` | `buildIngressiChiusureMonthlyPoints` | `lav-periodo`, `lav-chiusi` |
| `ReportMagazzinoChartsPanel` | `buildOrdiniFornitoriReportRows` | `mag_orders` |
| `ReportCrossCatenaSection` | `buildCrossCatenaValore` | batch only |
| `ReportCrossTrendSection` | `buildCrossMonthlyTrend` | KPI-only fallback if audit fails |

## §4 Legacy shell

`components/report/legacy-blocked/*` — BLOCKED/DEFER/KEEP_LEGACY only. Full `ReportSections` tree no longer mounted in BI accordion.

## §5 Domain status

| Domain | Status |
|--------|--------|
| Economia | REMOVED |
| Lavorazioni | CHARTS_PARTIAL |
| Magazzino | CHARTS_PARTIAL |
| Clienti/Mezzi | CHARTS_PARTIAL |
| Risorse | CHARTS_PARTIAL |
| Cross | CHARTS_PARTIAL |

## §6 Removal gates

`lib/report/legacy/domain-removal-gates.ts` — full REMOVED blocked while BLOCKED charts remain.

## §7 Parity tests

`lib/report/legacy/__tests__/legacy-chart-parity.test.ts`

## §8 Governance

Control: `governance.report.legacy-consolidation`

## §9 Risks residui

- `cross_*` `supportsSeries` remains false until per-metric bucket audit certifies engine path
- BLOCKED panels remain in collapsed legacy accordion until engine extensions land

## §10 Performance

No new eager queries in BI panels beyond existing hooks (`useOrdiniFornitoriQuery`, `useInvoicesQuery`). Legacy blocked panels lazy inside collapsed accordion.
