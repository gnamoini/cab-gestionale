import assert from "node:assert/strict";
import { getReportDensityTokens } from "@/components/report/design-system/tokens/visual-density";

for (const density of ["compact", "comfortable", "executive"] as const) {
  const t = getReportDensityTokens(density);
  assert.ok(t.sectionGap);
  assert.ok(t.metricGridCols);
  assert.ok(t.chartMinHeight);
}

console.log("report-design-system-layout.test.ts OK");
