import assert from "node:assert/strict";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";

const captured: { event: string; payload: { metricId: string; at?: string } }[] = [];

reportMetricObserver.setSink((event, payload) => {
  captured.push({ event, payload });
});

assert.doesNotThrow(() =>
  reportMetricObserver.emit("metric_calculation_failed", {
    metricId: "lav-chiusi",
    executionTimeMs: 42,
    message: "timeout",
  }),
);

assert.equal(captured.length, 1);
assert.equal(captured[0]?.event, "metric_calculation_failed");
assert.equal(captured[0]?.payload.metricId, "lav-chiusi");
assert.ok(captured[0]?.payload.at);

reportMetricObserver.setSink(null);
reportMetricObserver.emit("metric_parity_failed", { metricId: "eco_fatturato", parityStatus: "fail" });
const drained = reportMetricObserver.drain();
assert.equal(drained.length, 1);
assert.equal(drained[0]?.payload.metricId, "eco_fatturato");

console.log("report-metric-observability.test.ts OK");
