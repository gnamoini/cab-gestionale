import assert from "node:assert/strict";
import {
  REPORT_METRIC_REGISTRY,
  assertRegistryUnique,
  reportMetricIdsForSection,
} from "@/lib/report/metrics/report-metric-registry";
import { reportMetricRendererAudit } from "@/lib/report/metrics/report-metric-renderer-audit";

assert.doesNotThrow(() => assertRegistryUnique());

const TERMINAL_REPLACEMENT_STATUSES = new Set(["active", "archived"]);

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
  assert.ok(entry.valueCapability);
  assert.ok(entry.technicalOwner.trim().length > 0);
  assert.ok(entry.contractImpact);
  assert.equal(typeof entry.observabilityEnabled, "boolean");

  if (entry.valueCapability === "series") {
    assert.ok(entry.series, `series KPI ${entry.id} needs series config`);
  } else {
    assert.equal(entry.series, undefined, `scalar KPI ${entry.id} must not have series`);
  }
  if (entry.aggregation === "derived") {
    assert.ok(entry.formula?.trim(), `derived ${entry.id} needs formula`);
  }

  if (entry.status === "deprecated") {
    assert.ok(entry.replacementId?.trim(), `deprecated ${entry.id} needs replacementId`);
    const target = REPORT_METRIC_REGISTRY.find((e) => e.id === entry.replacementId);
    assert.ok(target, `deprecated ${entry.id} replacement ${entry.replacementId} not found`);
    assert.ok(
      TERMINAL_REPLACEMENT_STATUSES.has(target.status),
      `deprecated ${entry.id} replacement must be active or archived, got ${target.status}`,
    );
    assert.notEqual(target.status, "deprecated", `replacement chain must not point to deprecated ${entry.replacementId}`);
  }
}

const executiveP0 = ["lav-chiusi", "lav-aperti", "lav_late_sla", "eco_fatturato", "eco_da_incassare", "eco_importo_scaduto"];
for (const id of executiveP0) {
  const e = REPORT_METRIC_REGISTRY.find((r) => r.id === id);
  assert.ok(e, `executive P0 ${id} registered`);
  assert.equal(e?.observabilityEnabled, true, `${id} observabilityEnabled`);
}

const ecoFatturato = REPORT_METRIC_REGISTRY.find((e) => e.id === "eco_fatturato");
assert.ok(ecoFatturato);
assert.equal(ecoFatturato?.status, "active");

const ecoInvoices = REPORT_METRIC_REGISTRY.find((e) => e.id === "eco_invoices");
assert.ok(ecoInvoices);
assert.equal(ecoInvoices?.status, "deprecated");
assert.equal(ecoInvoices?.replacementId, "eco_fatturato");

const missing = reportMetricRendererAudit({ kpi: true, temporal: true });
assert.deepEqual(missing, [], `missing renderer handlers: ${missing.join(", ")}`);

assert.equal(reportMetricIdsForSection("lavorazioni").length, 7);

console.log("report-metric-registry.test.ts OK");
