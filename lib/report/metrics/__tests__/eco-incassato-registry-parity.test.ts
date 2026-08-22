import assert from "node:assert/strict";
import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

const manifest = getEngineManifestEntry("eco_incassato");
const registry = getRegistryEntry("eco_incassato");

assert.ok(manifest, "eco_incassato manifest entry required");
assert.ok(registry, "eco_incassato registry entry required");
assert.equal(manifest.calculatorId, "computeEcoIncassato");
assert.equal(registry.sourceModule, "invoice-calculations");
assert.equal(manifest.supportsSeries, true);
assert.equal(manifest.supportsCompare, true);
assert.ok(registry.series?.granularities.includes("month"));
assert.equal(registry.unit, "currency");
assert.equal(registry.trendSemantics, "higher_is_better");

console.log("eco-incassato-registry-parity.test.ts OK");
