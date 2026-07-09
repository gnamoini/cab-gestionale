import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const analyticsView = fs.readFileSync(
  path.join(ROOT, "components/report/report-analytics-view.tsx"),
  "utf8",
);
const executiveOverview = fs.readFileSync(
  path.join(ROOT, "components/report/layout/report-executive-overview.tsx"),
  "utf8",
);

const legacyZones = [
  "ReportTrendsZone",
  "ReportOperationalAnalysisZone",
  "ReportMaintenanceZone",
  "ReportExecutiveKpiSection",
];

for (const zone of legacyZones) {
  assert.doesNotMatch(analyticsView, new RegExp(`\\b${zone}\\b`), `${zone} must not be wired in analytics view`);
  assert.doesNotMatch(executiveOverview, new RegExp(`\\b${zone}\\b`), `${zone} must not be wired in executive overview`);
}

assert.match(analyticsView, /ReportSections/);
assert.match(analyticsView, /ReportAnalyticsDerivedProvider/);
assert.doesNotMatch(analyticsView, /ReportAiAnalysisZone/);

const stripKpis = fs.readFileSync(path.join(ROOT, "lib/report/report-kpi-catalog.ts"), "utf8");
assert.doesNotMatch(stripKpis, /section: "strip"/);

console.log("report-no-duplicate-data.test.ts OK");
