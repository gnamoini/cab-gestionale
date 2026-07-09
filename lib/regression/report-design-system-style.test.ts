import assert from "node:assert/strict";
import { getReportDensityTokens, REPORT_DEFAULT_DENSITY } from "@/components/report/design-system/tokens/visual-density";
import { assertSemanticUsage } from "@/components/report/design-system/tokens/semantic-colors-policy";

const tokens = getReportDensityTokens(REPORT_DEFAULT_DENSITY);
assert.ok(tokens.chartMinHeight.includes("min-h"));
assert.ok(tokens.metricGridCols.includes("grid-cols"));

let threw = false;
try {
  assertSemanticUsage("metricTrend", "success" as never);
} catch {
  threw = true;
}
assert.equal(threw, true);

console.log("report-design-system-style.test.ts OK");
