import assert from "node:assert/strict";
import { buildReportMetricCompare } from "@/lib/report/report-metric-compare";

const rangeA = { start: new Date("2025-01-01"), end: new Date("2025-01-31") };
const rangeB = { start: new Date("2024-01-01"), end: new Date("2024-01-31") };

const cmp = buildReportMetricCompare(120, 100, rangeA, rangeB, "prev_period", (n) => String(n));
assert.equal(cmp.value, "100");
assert.equal(cmp.deltaPct, 20);

const flat = buildReportMetricCompare(50, 50, rangeA, rangeB, "prev_period", String);
assert.equal(flat.deltaPct, 0);

console.log("report-metric-compare.test.ts OK");
