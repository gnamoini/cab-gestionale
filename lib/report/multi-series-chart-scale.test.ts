import assert from "node:assert/strict";
import {
  resolveSeriesAxisExtents,
  seriesAxisSide,
  valueToChartY,
} from "@/lib/report/multi-series-chart-scale";

const padT = 24;
const innerH = 200;

const series = [
  {
    axis: undefined as "left" | "right" | undefined,
    points: [{ displayValue: 2 }, { displayValue: 7 }, { displayValue: 5 }],
  },
  {
    axis: undefined as "left" | "right" | undefined,
    points: [{ displayValue: 1 }, { displayValue: 3 }, { displayValue: 4 }],
  },
  {
    axis: "right" as const,
    points: [{ displayValue: 0 }, { displayValue: -42 }, { displayValue: -56 }],
  },
];

const leftExtent = resolveSeriesAxisExtents(series, "dual-axis", "left");
const rightExtent = resolveSeriesAxisExtents(series, "dual-axis", "right");

assert.equal(seriesAxisSide({ axis: "right" }, "dual-axis"), "right");
assert.equal(seriesAxisSide({ axis: undefined }, "dual-axis"), "left");

for (const v of [0, -42, -56]) {
  const y = valueToChartY(v, rightExtent, padT, innerH);
  assert.ok(y >= padT - 0.01, `right y in view top: ${y}`);
  assert.ok(y <= padT + innerH + 0.01, `right y in view bottom: ${y}`);
}

const y7 = valueToChartY(7, leftExtent, padT, innerH);
assert.ok(y7 >= padT - 0.01 && y7 <= padT + innerH + 0.01, `left max in view: ${y7}`);

// ponytail: regressione coordinate utente (saldo su asse sinistro con solo max positivo)
const legacyY = padT + innerH - (-56 / 7) * innerH;
assert.ok(legacyY > padT + innerH + 100, "vecchia formula esplode fuori viewBox");

console.log("multi-series-chart-scale.test.ts OK");
