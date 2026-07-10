import assert from "node:assert/strict";
import { alignKpiSeries } from "@/lib/report/kpi-series/align";
import type { KpiSeries } from "@/lib/report/kpi-series/contracts/kpi-series-contract";

const a: KpiSeries = {
  metricId: "a",
  label: "A",
  unit: "count",
  granularity: "day",
  status: "ready",
  points: [
    { date: "2026-01-01", value: 1 },
    { date: "2026-01-03", value: 3 },
  ],
};

const b: KpiSeries = {
  metricId: "b",
  label: "B",
  unit: "count",
  granularity: "day",
  status: "ready",
  points: [{ date: "2026-01-02", value: 2 }],
};

const aligned = alignKpiSeries([a, b]);
assert.equal(aligned[0]!.points.length, 3);
assert.equal(aligned[1]!.points[0]!.value, null);
assert.equal(aligned[1]!.points[1]!.value, 2);

console.log("align.test.ts OK");
