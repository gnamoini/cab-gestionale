import assert from "node:assert/strict";
import {
  REPORT_METRIC_REGISTRY,
  assertRegistryUnique,
  reportMetricIdsForSection,
} from "@/lib/report/metrics/report-metric-registry";
import { reportMetricRendererAudit } from "@/lib/report/metrics/report-metric-renderer-audit";

assert.doesNotThrow(() => assertRegistryUnique());

for (const entry of REPORT_METRIC_REGISTRY) {
  assert.ok(entry.id.trim().length > 0);
  assert.ok(entry.label.trim().length > 0);
  assert.ok(entry.owner);
  assert.ok(entry.sourceModule.trim().length > 0);
  assert.ok(entry.unit);
  assert.ok(entry.aggregation);
  assert.ok(entry.applicability);
  assert.ok(entry.trendSemantics);
  assert.ok(entry.rendererKind);
  if (entry.aggregation === "derived") {
    assert.ok(entry.formula?.trim(), `derived ${entry.id} needs formula`);
  }
}

const missing = reportMetricRendererAudit({ kpi: true });
assert.deepEqual(missing, [], `missing renderer handlers: ${missing.join(", ")}`);

assert.equal(reportMetricIdsForSection("lavorazioni").length, 5);

console.log("report-metric-registry.test.ts OK");
