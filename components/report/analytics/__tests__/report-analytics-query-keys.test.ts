import assert from "node:assert/strict";
import { normalizeMetricIds, reportAnalyticsQueryKey } from "@/components/report/analytics/report-analytics-query-keys";
import { unionSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";

const union = unionSectionMetricIds(["economia", "lavorazioni"]);
assert.ok(union.includes("eco_fatturato"));
assert.ok(union.includes("lav-chiusi"));
assert.equal(normalizeMetricIds(["lav-chiusi", "eco_fatturato", "lav-chiusi"]).join(","), "eco_fatturato,lav-chiusi");

const keyA = reportAnalyticsQueryKey({
  period: { preset: "custom", start: "2026-06-01", end: "2026-06-30", compareMode: "none" },
  metricIds: ["lav-chiusi", "eco_fatturato"],
});
const keyB = reportAnalyticsQueryKey({
  period: { preset: "custom", start: "2026-06-01", end: "2026-06-30", compareMode: "none" },
  metricIds: ["eco_fatturato", "lav-chiusi"],
});
assert.deepEqual(keyA, keyB, "query key order-independent");

console.log("report-analytics-query-keys.test.ts OK");
