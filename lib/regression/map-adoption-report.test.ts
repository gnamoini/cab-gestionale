/**
 * MAP — adoption report shape and math.
 */
import assert from "node:assert/strict";
import {
  buildAdoptionReport,
  computeMapSuccessMetrics,
} from "@/lib/form-ux-migration/form-ux-adoption-report";

const report = buildAdoptionReport();

assert.ok(report.generatedAt);
assert.ok(report.global.totalFields >= 0);
assert.equal(
  report.global.ssotPct + report.global.legacyPct + report.global.shadowPct <= 101,
  true,
);

for (const tier of [0, 1, 2, 3] as const) {
  const bucket = report.byTier[tier];
  assert.equal(bucket.legacy + bucket.ssot, bucket.total);
}

const metrics = computeMapSuccessMetrics();
assert.ok(metrics.ssotAdoptionPct >= 0 && metrics.ssotAdoptionPct <= 100);
assert.ok(metrics.migrationVelocity >= 0);

console.log("map-adoption-report.test.ts OK");
