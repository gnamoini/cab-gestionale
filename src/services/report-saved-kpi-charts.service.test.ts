import assert from "node:assert/strict";
import { assertCanAddSavedCharts } from "@/lib/report/kpi-chart-config/validation";

assert.equal(assertCanAddSavedCharts(0, 30), null);
assert.ok(assertCanAddSavedCharts(30, 0) === null);
assert.ok(assertCanAddSavedCharts(25, 6) != null);

console.log("report-saved-kpi-charts.service.test.ts OK");
