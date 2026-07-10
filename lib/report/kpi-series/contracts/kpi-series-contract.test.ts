import assert from "node:assert/strict";
import type { KpiSeries } from "@/lib/report/kpi-series/contracts/kpi-series-contract";

function series(status: KpiSeries["status"]): KpiSeries {
  return {
    metricId: "test",
    label: "Test",
    unit: "count",
    granularity: "day",
    points: [{ date: "2026-01-01", value: 1 }],
    status,
  };
}

const s = series("ready");
assert.equal(s.metricId, "test");
assert.ok(["ready", "empty", "unavailable"].includes(s.status));

const empty = series("empty");
assert.equal(empty.points.length, 1);

console.log("kpi-series-contract.test.ts OK");
