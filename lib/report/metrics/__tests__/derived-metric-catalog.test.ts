import assert from "node:assert/strict";
import {
  derivedMetricCatalog,
  createDerivedMetric,
  defineDerivedMetrics,
} from "@/lib/report/metrics/derived-metric-catalog";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";

for (const entry of derivedMetricCatalog) {
  assert.equal(entry.metricId, resolveCanonicalMetricId(entry.metricId));
  assert.ok(getRegistryEntry(entry.metricId), `registry entry for ${entry.metricId}`);
}

assert.throws(() =>
  createDerivedMetric("eco_invoices", {
    category: "cross",
    sourceDatasets: ["economico"],
  }),
);

assert.throws(() =>
  defineDerivedMetrics([
    createDerivedMetric("cross_efficiency", { category: "cross", sourceDatasets: ["lavorazioni", "ore"] }),
    createDerivedMetric("cross_efficiency", { category: "cross", sourceDatasets: ["lavorazioni", "ore"] }),
  ]),
);

console.log("derived-metric-catalog.test.ts OK");
