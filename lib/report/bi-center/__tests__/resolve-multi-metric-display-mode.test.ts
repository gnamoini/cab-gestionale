import assert from "node:assert/strict";
import {
  resolveMultiMetricDisplayMode,
  CROSS_DOMAIN_PAIRS,
} from "@/lib/report/bi-center/resolve-multi-metric-display-mode";

assert.equal(resolveMultiMetricDisplayMode("lav-periodo", "lav-chiusi", "week"), "direct_overlay");
assert.equal(resolveMultiMetricDisplayMode("eco_fatturato", "lav-chiusi", "month"), "dual_scale");

for (const pair of CROSS_DOMAIN_PAIRS) {
  const mode = resolveMultiMetricDisplayMode(pair.metricA, pair.metricB, pair.granularity);
  assert.notEqual(mode, "blocked", `${pair.id} should not be blocked`);
}

console.log("resolve-multi-metric-display-mode.test.ts OK");
