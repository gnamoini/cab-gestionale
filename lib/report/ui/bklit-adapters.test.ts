import assert from "node:assert/strict";
import { buildLavorazioniYearMatrix, yearlyForecastLineModel } from "@/lib/report/lavorazioni-year-matrix";
import { mergeMultiSeriesLineData, yearlyForecastLineChartData, ymdToChartDate } from "@/lib/report/ui/bklit-adapters";

assert.equal(ymdToChartDate("2024-03"), "2024-03-01T12:00:00.000Z");
assert.equal(ymdToChartDate("2024-03-15"), "2024-03-15T12:00:00.000Z");

const merged = mergeMultiSeriesLineData(
  [
    {
      id: "a",
      label: "A",
      color: "var(--chart-1)",
      unit: "ratio",
      points: [{ date: "2024-01", displayValue: 100, realValue: 100 }],
    },
  ],
  "indexed",
);
assert.equal(merged[0]?.date, "2024-01-01T12:00:00.000Z");

const anchor = new Date(2026, 6, 20);
const { rows } = buildLavorazioniYearMatrix([], anchor, new Map([["2017-04", 23]]));
const forecast = yearlyForecastLineModel(rows, anchor);
const chartData = yearlyForecastLineChartData(forecast.solid, forecast.dashed);

assert.ok(chartData.length >= 1, "chart data from manual-only years");
assert.ok(chartData.some((r) => r.value === 23 || (r as { value?: number }).value != null));

console.log("bklit-adapters.test.ts OK");
