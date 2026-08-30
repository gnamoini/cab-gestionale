import assert from "node:assert/strict";
import {
  buildHubSummary,
  hubMeasuredScalar,
} from "@/lib/report/hub/build-hub-summary";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { ReportMetric } from "@/lib/report/metrics/report-metric-types";

function env(
  metricId: string,
  value: number,
  trust: ReportMetricEnvelope["trust"],
  previousValue?: number,
): ReportMetricEnvelope {
  const compare: ReportMetric["compare"] =
    previousValue == null
      ? null
      : {
          status: "available",
          previousValue,
          deltaAbs: value - previousValue,
          deltaPercent: previousValue === 0 ? (value === 0 ? 0 : null) : ((value - previousValue) / previousValue) * 100,
        };
  return {
    metric: { id: metricId, value, compare, source: { module: "test" } },
    metricId,
    period: { from: "2026-01-01", to: "2026-03-31" },
    unit: "currency",
    semantics: "flow",
    trust,
    formulaId: "test",
  };
}

const filled = new Map<string, ReportMetricEnvelope>([
  ["eco_incassato", env("eco_incassato", 100_000, "verified", 80_000)],
  ["eco_fatturato", env("eco_fatturato", 120_000, "verified", 110_000)],
  ["cost-tot", env("cost-tot", 40_000, "estimated", 50_000)],
  ["lav-periodo", env("lav-periodo", 12, "verified", 10)],
  ["clienti", env("clienti", 5, "verified", 4)],
]);

const kpis = buildHubSummary(filled);
const byId = Object.fromEntries(kpis.map((k) => [k.id, k]));

assert.equal(byId.incassi?.value, 100_000);
assert.equal(byId.fatturato?.value, 120_000);
assert.notEqual(byId.incassi?.value, byId.fatturato?.value, "fatturato distinct from incassi");
assert.equal(byId.costi?.value, 40_000);
assert.equal(byId.margine?.value, 60_000);
assert.equal(byId.margine_pct?.value, 60);
assert.equal(byId.lavorazioni?.value, 12);
assert.equal(byId.clienti?.value, 5);
assert.equal(byId.incassi?.deltaPercent, 25);
assert.equal(byId.costi?.invertTrend, true);
assert.match(byId.incassi?.formatted ?? "", /€|100/);

const empty = buildHubSummary(new Map());
for (const row of empty) {
  assert.equal(row.value, null);
  assert.equal(row.formatted, "—");
  assert.equal(row.deltaPercent, null);
}

assert.equal(hubMeasuredScalar(env("eco_incassato", 0, "partial")), null);
assert.equal(hubMeasuredScalar(env("eco_fatturato", 0, "not_available")), null);
assert.equal(hubMeasuredScalar(env("lav-periodo", 0, "verified")), 0);

const zeroIncassi = new Map<string, ReportMetricEnvelope>([
  ["eco_incassato", env("eco_incassato", 0, "verified")],
  ["cost-tot", env("cost-tot", 10_000, "estimated")],
]);
const zeroRows = Object.fromEntries(buildHubSummary(zeroIncassi).map((k) => [k.id, k]));
assert.notEqual(zeroRows.incassi?.formatted, "—");
assert.equal(zeroRows.margine?.value, -10_000);
assert.equal(zeroRows.margine_pct?.value, null);
assert.equal(zeroRows.margine_pct?.formatted, "—");

console.log("build-hub-summary.test.ts OK");
