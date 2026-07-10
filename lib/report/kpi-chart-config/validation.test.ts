import assert from "node:assert/strict";
import { parseKpiChartConfigBody, assertCanAddSavedCharts, validateChartName } from "@/lib/report/kpi-chart-config/validation";

const valid = {
  metricIds: ["lav-periodo", "lav-chiusi"],
  preset: "last_30_days",
  customFrom: "",
  customTo: "",
  displayMode: "indexed",
  normalization: { mode: "indexed", baseline: "first-visible-point", missing: "ignore" },
} as const;

assert.ok(parseKpiChartConfigBody(valid));
assert.equal(parseKpiChartConfigBody({ ...valid, metricIds: ["a", "b", "c", "d", "e", "f"] }), null);
assert.equal(validateChartName("  "), "Nome obbligatorio.");
assert.ok(assertCanAddSavedCharts(29, 1) === null);
assert.ok(assertCanAddSavedCharts(30, 1)?.includes("30"));

console.log("validation.test.ts OK");
