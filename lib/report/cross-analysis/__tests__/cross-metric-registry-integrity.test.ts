import assert from "node:assert/strict";
import { CROSS_METRIC_REGISTRY, CROSS_P0_METRIC_IDS } from "@/lib/report/cross-analysis/cross-metric-registry";
import { derivedMetricCatalog } from "@/lib/report/metrics/derived-metric-catalog";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

assert.equal(CROSS_METRIC_REGISTRY.length, 4);
assert.deepEqual(
  CROSS_METRIC_REGISTRY.map((m) => m.metricId).sort(),
  [...CROSS_P0_METRIC_IDS].sort(),
);

for (const def of CROSS_METRIC_REGISTRY) {
  assert.ok(getRegistryEntry(def.metricId));
  assert.ok(def.displayKey.startsWith("report.cross."));
  assert.ok(def.sourceDatasets.length >= 2);
}

for (const derived of derivedMetricCatalog) {
  const crossDef = CROSS_METRIC_REGISTRY.find((c) => c.metricId === derived.metricId);
  if (derived.category === "cross") {
    assert.ok(crossDef, `cross registry for ${derived.metricId}`);
  }
}

console.log("cross-metric-registry-integrity.test.ts OK");
