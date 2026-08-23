import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const REFACTORED_AREAS = [
  "report-area-panoramica-view.tsx",
  "report-area-economia-view.tsx",
  "report-area-preventivi-view.tsx",
  "report-area-clienti-view.tsx",
  "report-area-trasversali-view.tsx",
  "report-area-contesto-view.tsx",
];

const ROOT = path.join(process.cwd(), "components", "report", "areas");
const MONOLITHIC_ONLY = [
  "ReportEconomiaSection",
  "ReportPreventiviSection",
  "ReportClientiSection",
  "ReportCrossMetricsSection",
  "ReportCrossDomainSection",
  "ReportCrossCatenaSection",
  "ReportCrossTrendSection",
  "ReportOperationalContextPanel",
  "ReportTimelineV2",
  "ReportExecutiveOverview",
  "ReportPrimaryTrendSection",
  "ReportHistoricalTrendSection",
];

const LAYOUT_COMPOSERS = ["ReportLayoutKpiStrip", "ReportLayoutMainAside", "ReportLayoutSplit", "ReportLayoutDetail"];

for (const file of REFACTORED_AREAS) {
  const content = fs.readFileSync(path.join(ROOT, file), "utf8");
  assert.ok(
    LAYOUT_COMPOSERS.some((c) => content.includes(c)),
    `${file} must orchestrate layout via ReportLayout* (not monolithic child only)`,
  );
  for (const mono of MONOLITHIC_ONLY) {
    const importPattern = new RegExp(`\\b${mono}\\b`);
    if (importPattern.test(content)) {
      assert.fail(`${file} must not import monolithic section ${mono} — use content exports`);
    }
  }
}

console.log("report-area-orchestration.test.ts OK");
