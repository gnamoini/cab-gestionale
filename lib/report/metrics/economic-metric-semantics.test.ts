import assert from "node:assert/strict";
import {
  ECONOMIC_METRIC_SEMANTICS,
  QUOTE_CONVERSION_PCT_SEMANTICS,
} from "@/lib/report/metrics/economic-metric-semantics";

assert.equal(ECONOMIC_METRIC_SEMANTICS.revenue.metricId, "eco_fatturato");
assert.equal(ECONOMIC_METRIC_SEMANTICS.revenue.formulaId, "invoice_emitted_in_period");
assert.equal(ECONOMIC_METRIC_SEMANTICS.revenue.semantics, "flow");
assert.equal(ECONOMIC_METRIC_SEMANTICS.receivables.semantics, "snapshot");
assert.equal(ECONOMIC_METRIC_SEMANTICS.estimated_operational_margin.trust, "estimated");
assert.equal(QUOTE_CONVERSION_PCT_SEMANTICS.implementationStatus, "blocked");

console.log("economic-metric-semantics.test.ts OK");
