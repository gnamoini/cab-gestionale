import assert from "node:assert/strict";
import { validateAnalyticsMetricIds, AnalyticsMetricValidationError } from "@/lib/report/analytics-engine/validate-metric-ids";

const ok = validateAnalyticsMetricIds(["eco_fatturato", "lav-chiusi"]);
assert.deepEqual(ok, ["eco_fatturato", "lav-chiusi"]);

assert.throws(
  () => validateAnalyticsMetricIds(["quote_conversion_pct"]),
  (err: unknown) => err instanceof AnalyticsMetricValidationError,
);

assert.throws(
  () => validateAnalyticsMetricIds(["totally-unknown-metric"]),
  (err: unknown) => err instanceof AnalyticsMetricValidationError,
);

console.log("validate-metric-ids.test.ts OK");
