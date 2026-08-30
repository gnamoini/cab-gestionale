import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SECTIONS_DIR = path.join(ROOT, "components/report/sections");

const SECTION_PATTERN_EXPECTATIONS: Record<
  string,
  { patterns: readonly ("card" | "table" | "chart" | "matrix")[]; mustInclude: readonly string[] }
> = {
  "report-lavorazioni-section.tsx": {
    patterns: ["card", "chart", "matrix", "table"],
    mustInclude: [
      "ReportBarChart",
      "ReportMatrix",
      "ReportDataTable",
      "ReportExecutiveSummaryContent",
      "ReportLavorazioniBacklogAlerts",
      "ReportExecutiveKpiSection",
      "ReportIngressiChiusureChart",
      "ReportAgingBacklogStackedChart",
      "ReportLavorazioniFilters",
      "ReportLavorazioniFunnelChart",
      "ReportCloseTimePrioritaChart",
    ],
  },
  "report-magazzino-section.tsx": {
    patterns: ["card", "table", "chart", "matrix"],
    mustInclude: [
      "ReportMagazzinoHeroKpiSection",
      "ReportDataTable",
      "ReportMatrix",
      "ReportMagazzinoStockAlerts",
      "MagazzinoEntrateUsciteStackedBars",
      "MagazzinoCapitalLineChart",
    ],
  },
  "report-ore-section.tsx": {
    patterns: ["card", "table"],
    mustInclude: ["ReportDomainMetricsGrid", "ReportEmbeddedModule", "ReportDataTable", "ReportSectionTrendWidget"],
  },
  "report-economici-section.tsx": {
    patterns: ["card", "chart", "table"],
    mustInclude: [
      "ReportEconomicMetricsLayout",
      "ReportRevenueCollectionChart",
      "ReportDataTable",
      "KpiPerformanceEconomic",
      "ReportArAgingChart",
      "ReportMarginWaterfallChart",
      "ReportPreventiviFunnelChart",
      "ReportRevenueMixDonut",
      "ReportEconomicTabs",
      "ReportClienteAgingHeatmap",
    ],
  },
  "report-clienti-mezzi-section.tsx": {
    patterns: ["card", "chart", "table"],
    mustInclude: [
      "ReportUnifiedKpiGrid",
      "ReportTopMezzi",
      "ReportFleetAlerts",
      "KpiPerformanceFleet",
      "ClientiParetoChart",
      "KpiPerformanceCompliance",
      "ReportClientiMezziDettaglioTabs",
    ],
  },
  "report-cross-section.tsx": {
    patterns: ["card"],
    mustInclude: [
      "ReportBarChart",
      "ReportDataTable",
      "ReportMatrix",
      "ReportMultiSeriesLineChart",
      "CrossTrustBanner",
    ],
  },
  "report-ai-section.tsx": {
    patterns: [],
    mustInclude: ["ReportNarrativeBlock", "ReportEmbeddedModule"],
  },
};

const LAYOUT_DELEGATE_EXPECTATIONS: Record<string, { mustInclude: readonly string[] }> = {
  "report-magazzino-hero-kpi-section.tsx": {
    mustInclude: ["ReportDomainMetricsGrid", "ReportUnifiedKpiGrid"],
  },
};

const KPI_MODULE_DELEGATE_EXPECTATIONS: Record<string, { mustInclude: readonly string[] }> = {
  "kpi-performance-fleet.tsx": {
    mustInclude: ["DisponibilitaClienteBarChart", "GuastiTipoDonutChart"],
  },
};

for (const [file, spec] of Object.entries(SECTION_PATTERN_EXPECTATIONS)) {
  const text = fs.readFileSync(path.join(SECTIONS_DIR, file), "utf8");
  for (const component of spec.mustInclude) {
    assert.ok(text.includes(component), `${file} deve usare ${component}`);
  }
  assert.match(text, /@\/components\/report\/design-system/, `${file} deve importare composition API`);
}

const LAYOUT_DIR = path.join(ROOT, "components/report/layout");
for (const [file, spec] of Object.entries(LAYOUT_DELEGATE_EXPECTATIONS)) {
  const text = fs.readFileSync(path.join(LAYOUT_DIR, file), "utf8");
  for (const component of spec.mustInclude) {
    assert.ok(text.includes(component), `${file} deve usare ${component}`);
  }
}

const KPI_DIR = path.join(ROOT, "components/report/kpi-performance");
for (const [file, spec] of Object.entries(KPI_MODULE_DELEGATE_EXPECTATIONS)) {
  const text = fs.readFileSync(path.join(KPI_DIR, file), "utf8");
  for (const component of spec.mustInclude) {
    assert.ok(text.includes(component), `${file} deve usare ${component}`);
  }
}

console.log("report-data-patterns-audit.test.ts OK");
