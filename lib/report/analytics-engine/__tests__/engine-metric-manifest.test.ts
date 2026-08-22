import assert from "node:assert/strict";
import { ENGINE_METRIC_MANIFEST } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

for (const [id, manifest] of Object.entries(ENGINE_METRIC_MANIFEST)) {
  assert.equal(manifest.metricId, id);
  assert.ok(manifest.calculatorId, `${id} calculatorId`);
  assert.equal(typeof manifest.supportsCompare, "boolean", `${id} supportsCompare explicit`);
  assert.equal(typeof manifest.supportsSeries, "boolean", `${id} supportsSeries explicit`);
  const reg = getRegistryEntry(id);
  assert.ok(reg, `${id} in registry`);
  assert.notEqual(reg?.status, "blocked", `${id} not blocked`);
}

assert.equal(ENGINE_METRIC_MANIFEST.quote_conversion_pct, undefined, "blocked metric excluded");

console.log("engine-metric-manifest.test.ts OK");
