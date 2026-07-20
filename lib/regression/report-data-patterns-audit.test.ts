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
      "ReportDomainMetricsGrid",
      "ReportBarChart",
      "ReportDataTable",
      "ReportMatrix",
      "ReportUnifiedKpiGrid",
      "ReportMagazzinoStockAlerts",
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
      "DisponibilitaClienteBarChart",
      "GuastiTipoDonutChart",
      "ClientiParetoChart",
      "KpiPerformanceCompliance",
      "ReportClientiMezziDettaglioTabs",
    ],
  },
  "report-cross-section.tsx": {
    patterns: ["card"],
    mustInclude: ["ReportDomainMetricsGrid"],
  },
  "report-ai-section.tsx": {
    patterns: [],
    mustInclude: ["ReportNarrativeBlock", "ReportEmbeddedModule"],
  },
};

for (const [file, spec] of Object.entries(SECTION_PATTERN_EXPECTATIONS)) {
  const text = fs.readFileSync(path.join(SECTIONS_DIR, file), "utf8");
  for (const component of spec.mustInclude) {
    assert.ok(text.includes(component), `${file} deve usare ${component}`);
  }
  assert.match(text, /@\/components\/report\/design-system/, `${file} deve importare composition API`);
}

console.log("report-data-patterns-audit.test.ts OK");
