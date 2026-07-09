import assert from "node:assert/strict";
import { fromKpiCardModel } from "@/lib/report/adapters/from-kpi-card-model";
import type { KpiCardModel } from "@/lib/report/build-report-model";
import { getMetricDefinition } from "@/lib/report/metrics/get-metric-definition";
import { REPORT_METRIC_REGISTRY } from "@/lib/report/metrics/report-metric-registry";
import { reportMetricRendererAudit } from "@/lib/report/metrics/report-metric-renderer-audit";
import { REPORT_RENDERER_KINDS } from "@/lib/report/report-renderer-kinds";

for (const entry of REPORT_METRIC_REGISTRY) {
  assert.ok(entry.sourceModule);
  assert.ok(entry.unit);
  assert.ok(entry.owner);
  assert.ok(entry.category);
  if (entry.status === "active") {
    const def = getMetricDefinition(entry.id);
    assert.equal(def.id, entry.id);
  }
}

const sample: KpiCardModel = {
  id: "lav-periodo",
  label: "legacy",
  value: "42",
  compareRows: null,
};
const metric = fromKpiCardModel(sample);
assert.ok(metric);
assert.equal(typeof metric!.value, "number");
assert.equal(metric!.value, 42);
assert.ok(metric!.compare === null || typeof metric!.compare === "object");

const missing = reportMetricRendererAudit(
  Object.fromEntries(REPORT_RENDERER_KINDS.map((k) => [k, true])) as Partial<Record<import("@/lib/report/metrics/report-metric-types").ReportMetricKind, unknown>>,
);
assert.deepEqual(missing, []);

console.log("report-metric-contract.test.ts OK");
