import assert from "node:assert/strict";
import {
  getPlottableMetrics,
  validateChartSelection,
} from "@/lib/report/kpi-series/capability-matrix";

const plottable = getPlottableMetrics();
const ids = plottable.map((p) => p.metricId).sort();

assert.deepEqual(ids, [
  "cost-tot",
  "eco_fatturato",
  "eco_incassato",
  "lav-chiusi",
  "lav-media-settimanale",
  "lav-periodo",
  "presence_hours_total",
  "ric-usati",
]);

const lavPeriodo = plottable.find((p) => p.metricId === "lav-periodo")!;
assert.equal(lavPeriodo.day, true);
assert.equal(lavPeriodo.week, true);
assert.equal(lavPeriodo.month, true);
assert.equal(lavPeriodo.indexed, true);
assert.equal(lavPeriodo.absolute, true);

const eco = plottable.find((p) => p.metricId === "eco_fatturato")!;
assert.equal(eco.day, false);
assert.equal(eco.week, false);
assert.equal(eco.month, true);

const invalid = validateChartSelection(["lav-periodo"], "day", "indexed");
assert.equal(invalid.ok, false);

const badBucket = validateChartSelection(["lav-periodo", "eco_fatturato"], "day", "indexed");
assert.equal(badBucket.ok, false);

const ok = validateChartSelection(["lav-periodo", "lav-chiusi"], "week", "indexed");
assert.equal(ok.ok, true);

console.log("capability-matrix.test.ts OK");
