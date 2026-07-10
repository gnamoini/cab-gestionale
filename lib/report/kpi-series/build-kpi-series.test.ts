import assert from "node:assert/strict";
import { buildKpiSeries } from "@/lib/report/kpi-series/build-kpi-series";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";

const range = {
  start: startOfLocalDay(new Date(2026, 0, 1)),
  end: endOfLocalDay(new Date(2026, 0, 31)),
};

const bundle = buildKpiSeries({
  metricIds: ["lav-periodo", "lav-chiusi"],
  range,
  context: {
    attive: [],
    storico: [],
    completate: [],
    magLog: [],
    prodotti: [],
  },
});

assert.equal(bundle.series.length, 2);
assert.ok(bundle.series.every((s) => s.metricId === "lav-periodo" || s.metricId === "lav-chiusi"));
assert.equal(bundle.range.start, "2026-01-01");

console.log("build-kpi-series.test.ts OK");
