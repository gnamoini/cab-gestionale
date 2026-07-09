import assert from "node:assert/strict";
import { buildReportMetricCompare } from "@/lib/report/report-metric-compare";

const rangeA = { from: "2025-01-01", to: "2025-01-31" };
const rangeB = { from: "2024-01-01", to: "2024-01-31" };

const cmp = buildReportMetricCompare(120, 100, rangeA, rangeB, "previous_period", (n) => String(n));
assert.equal(cmp.value, "100");
assert.equal(cmp.deltaPct, 20);

const flat = buildReportMetricCompare(50, 50, rangeA, rangeB, "previous_period", String);
assert.equal(flat.deltaPct, 0);

console.log("report-metric-compare.test.ts OK");
