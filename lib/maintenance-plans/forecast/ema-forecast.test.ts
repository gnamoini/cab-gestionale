import assert from "node:assert/strict";
import { computeEmaForecast } from "@/lib/maintenance-plans/forecast/ema-forecast";

const forecast = computeEmaForecast({
  intervalType: "ore",
  intervalValue: 500,
  currentValue: 1200,
  executions: [
    { performedAt: "2025-01-01", valueAtService: 500 },
    { performedAt: "2025-02-01", valueAtService: 1000 },
    { performedAt: "2025-03-01", valueAtService: 1500 },
  ],
});

assert.equal(forecast.nextMilestoneValue, 2000);
assert.ok(forecast.remainingValue > 0);
assert.ok(forecast.confidenceReason.length > 0);
assert.ok(["alta", "media", "bassa"].includes(forecast.confidenceLevel));

const sparse = computeEmaForecast({
  intervalType: "ore",
  intervalValue: 500,
  currentValue: 400,
  executions: [{ performedAt: "2025-01-01", valueAtService: 0 }],
});
assert.equal(sparse.confidenceLevel, "bassa");

console.log("ema-forecast.test.ts OK");
