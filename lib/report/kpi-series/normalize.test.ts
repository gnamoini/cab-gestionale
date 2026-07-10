import assert from "node:assert/strict";
import { normalizeSeries } from "@/lib/report/kpi-series/normalize";
import type { KpiSeries } from "@/lib/report/kpi-series/contracts/kpi-series-contract";

const base: KpiSeries = {
  metricId: "lav-chiusi",
  label: "Chiusure",
  unit: "count",
  granularity: "week",
  status: "ready",
  points: [
    { date: "2026-01-01", value: 100 },
    { date: "2026-01-08", value: 120 },
  ],
};

const indexed = normalizeSeries(base, {
  mode: "indexed",
  baseline: "first-visible-point",
  missing: "ignore",
});
assert.equal(indexed.displayValues[0]!.value, 100);
assert.equal(indexed.displayValues[1]!.value, 120);

const absolute = normalizeSeries(base, {
  mode: "absolute",
  baseline: "first-visible-point",
  missing: "ignore",
});
assert.equal(absolute.displayValues[1]!.value, 120);

console.log("normalize.test.ts OK");
