import assert from "node:assert/strict";
import { resolveSupportedReportMetrics } from "@/lib/report/business-report/metric-selection";

const weekly = resolveSupportedReportMetrics("weekly");
assert.ok(weekly.supported.length > 0);
assert.ok(weekly.supported.includes("eco_fatturato"));

const withBad = resolveSupportedReportMetrics("weekly", ["quote_conversion_pct", "not_a_metric"]);
assert.ok(withBad.skipped.length >= 1);

console.log("metric-selection.test.ts OK");
