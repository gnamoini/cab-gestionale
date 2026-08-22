import assert from "node:assert/strict";
import { listPrimaryTrendEligibleMetrics } from "@/components/report/analytics/resolve-series-eligible-metrics";

const week = listPrimaryTrendEligibleMetrics("week");
assert.ok(week.includes("lav-chiusi"));
assert.ok(!week.includes("eco_fatturato"), "eco_fatturato is month-only in registry");
const month = listPrimaryTrendEligibleMetrics("month");
assert.ok(month.includes("eco_fatturato"));
assert.ok(!month.includes("quote_conversion_pct"));

console.log("resolve-series-eligible-metrics.test.ts OK");
