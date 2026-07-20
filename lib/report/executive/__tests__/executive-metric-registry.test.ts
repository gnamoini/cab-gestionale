import assert from "node:assert/strict";
import { EXECUTIVE_METRIC_REGISTRY, sortedExecutiveMetrics } from "@/lib/report/executive/executive-metric-registry";

assert.equal(EXECUTIVE_METRIC_REGISTRY.length, 6);
const sorted = sortedExecutiveMetrics();
assert.deepEqual(
  sorted.map((d) => d.priority),
  [1, 2, 3, 4, 5, 6],
);

const datasets = new Set(sorted.map((d) => d.dataset));
assert.ok(datasets.has("lavorazioni"));
assert.ok(datasets.has("magazzino"));
assert.ok(datasets.has("economico"));

console.log("executive-metric-registry.test.ts OK");
