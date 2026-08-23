import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const areaDataShell = fs.readFileSync(
  path.join(ROOT, "components/report/report-area-data-shell.tsx"),
  "utf8",
);
const executiveOverview = fs.readFileSync(
  path.join(ROOT, "components/report/bi-center/report-executive-overview.tsx"),
  "utf8",
);

const legacyZones = [
  "ReportTrendsZone",
  "ReportOperationalAnalysisZone",
  "ReportMaintenanceZone",
  "ReportExecutiveKpiSection",
];

for (const zone of legacyZones) {
  assert.doesNotMatch(areaDataShell, new RegExp(`\\b${zone}\\b`), `${zone} must not be wired in area data shell`);
  assert.doesNotMatch(executiveOverview, new RegExp(`\\b${zone}\\b`), `${zone} must not be wired in executive overview`);
}

assert.doesNotMatch(areaDataShell, /ReportBiCenterMount/);
assert.doesNotMatch(areaDataShell, /ReportAiAnalysisZone/);

const stripKpis = fs.readFileSync(path.join(ROOT, "lib/report/report-kpi-catalog.ts"), "utf8");
assert.doesNotMatch(stripKpis, /section: "strip"/);

console.log("report-no-duplicate-data.test.ts OK");
