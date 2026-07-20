import assert from "node:assert/strict";
import { EXECUTIVE_METRIC_REGISTRY } from "@/lib/report/executive/executive-metric-registry";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

for (const def of EXECUTIVE_METRIC_REGISTRY) {
  const entry = getRegistryEntry(def.metricId);
  assert.ok(entry, `executive metric ${def.metricId} must exist in report-metric-registry`);
  assert.equal(def.drillDown.metricId, def.metricId, `drillDown metricId mismatch for ${def.metricId}`);
}

console.log("executive-registry-integrity.test.ts OK");
