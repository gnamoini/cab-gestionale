import assert from "node:assert/strict";
import { buildLabelPdfMetricsPayload } from "@/lib/inventory-labels/observability/label-pdf-metrics";

const p = buildLabelPdfMetricsPayload({
  labelCount: 10,
  cacheHitCount: 3,
  cacheMissCount: 7,
  durationMs: 1200,
  outcome: "ok",
  pipeline: "primary",
  mode: "sync",
});

assert.equal(p.labelCount, 10);
assert.equal(p.cacheHitCount, 3);
assert.equal(p.cacheMissCount, 7);
assert.equal(p.durationMs, 1200);
assert.equal(p.outcome, "ok");
assert.equal(p.pipeline, "primary");
assert.notEqual("rasterMs" in p, true);

console.log("inventory-labels/observability/label-pdf-metrics.test.ts OK");
