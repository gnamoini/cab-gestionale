# Report Data Completion — Completion Report

> **Date:** 2026-08-22  
> **Pre-gate:** `ci:tsc` + `build` + data-integration + data-completion suites  
> **Plan:** Data Completion & Consolidation v2

---

## §1 Scope delivered

| Item | Status |
|------|--------|
| `eco_importo_scaduto` semantics + registry + engine + drill-down | ✅ |
| `cross_*` engine (4 metrics) + `ReportCrossMetricsSection` | ✅ |
| Economia charts migration (revenue, AR aging, funnel, cliente heatmap snapshot) | ✅ |
| Margin waterfall in BI Advanced | **BLOCKED** — `eco_margine_operativo_stimato` remains certified replacement |
| Economia legacy removal (`dati_economici`) | ✅ after §4.0 gate |
| Cross legacy KPI grid dedup | ✅ |
| Legacy migration matrix + removal regression test | ✅ |
| Control suite `governance.report.data-completion` | ✅ |

---

## §2 Engine metrics

**Before:** 25 metrics  
**After:** 30 metrics (+ `eco_importo_scaduto`, + 4 `cross_*`)

---

## §3 Economia removal gate

All items in [`economia-removal-gate.ts`](../lib/report/legacy/economia-removal-gate.ts) passed before `dati_economici` marked `REMOVED`.

Margin visualization: waterfall **not** migrated; approved replacement = `eco_margine_operativo_stimato` KPI + trend.

---

## §4 Cliente heatmap semantics

- Reference date: report `anchor` (snapshot)
- Not period-bound — toolbar period does not alter heatmap
- UI label: "fotografia al {date}" + footnote in charts panel

---

## §5 Progressive legacy status

| Domain | Legacy section | Status |
|--------|----------------|--------|
| Economia | `dati_economici` | REMOVED |
| Lavorazioni | `lavorazioni` | KPI_MIGRATED — section retained (work-order charts) |
| Magazzino | `magazzino_ricambi` | KPI_MIGRATED |
| Clienti | `clienti_mezzi` | KPI_MIGRATED |
| Risorse | `ore_lavorate` | KPI_MIGRATED |
| Cross | `analisi_incrociate` | KPI grid migrated to BI; advanced charts retained |

---

## §6 Tests

- `eco-importo-scaduto-parity.test.ts`
- `cross-metric-parity.test.ts`
- `report-legacy-domain-removal.test.ts`
- E2E: `report-data-completion.spec.ts`

---

## §7 Residual risks

- Margin waterfall remains only in collapsed legacy reference until step semantics certified
- Lavorazioni/Magazzino/Clienti/Risorse legacy sections still contain charts not yet in BI Advanced
- E2E may report `BLOCKED_EXTERNAL_ENV` without `SMOKE_ADMIN_*`

---

## §8 Files touched (summary)

- Engine: `calculators/index.ts`, `engine-metric-manifest.ts`, `cross/cross-formula-input-from-bundle.ts`, `calculators/compute-cross-metrics.ts`
- Registry: `report-metric-registry.ts`, `economic-metric-semantics.ts`, `section-data-map.ts`
- UI: `report-economia-charts-panel.tsx`, `report-domain-sections.tsx`, `report-cross-metrics-section.tsx`, `report-advanced-analysis-shell.tsx`
- Legacy: `legacy-migration-matrix.ts`, `economia-removal-gate.ts`, `report-sections.tsx`, `report-cross-section.tsx`
- Governance: `report-data-completion.suite.ts`, `catalog.ts`, `registry.ts`

---

## §9 Verification commands

```bash
npm run ci:tsc
npm run build
npm run control:pr -- --only governance.report.data-completion
```

---

## §10 Sign-off

Data Completion milestone closes the Economia legacy domain and ports cross KPIs to the Analytics Engine. Remaining legacy domains are tracked in the migration matrix for future chart parity waves.
