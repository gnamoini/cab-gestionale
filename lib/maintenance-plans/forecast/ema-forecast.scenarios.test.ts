import assert from "node:assert/strict";
import { computeEmaForecast } from "@/lib/maintenance-plans/forecast/ema-forecast";

// Scenario A — utilizzo costante (ultimo 1000h, attuale 1450h)
const scenarioA = computeEmaForecast({
  intervalType: "ore",
  intervalValue: 500,
  currentValue: 1450,
  today: "2026-04-01",
  executions: [
    { performedAt: "2025-10-01", valueAtService: 500 },
    { performedAt: "2025-11-01", valueAtService: 1000 },
  ],
});
assert.equal(scenarioA.nextMilestoneValue, 1500);
assert.equal(scenarioA.remainingValue, 50);
assert.ok(scenarioA.nextDateEstimated != null);

// Scenario B — mezzo fermo (ultimo tagliando > 90gg fa, poco utilizzo)
const scenarioB = computeEmaForecast({
  intervalType: "ore",
  intervalValue: 500,
  currentValue: 1100,
  today: "2026-07-01",
  executions: [{ performedAt: "2025-01-01", valueAtService: 1000 }],
});
assert.match(scenarioB.confidenceReason, /insufficient_usage_history/);
assert.equal(scenarioB.confidenceLevel, "bassa");

// Scenario C — salto contatore / multi-interval overdue
const scenarioC = computeEmaForecast({
  intervalType: "ore",
  intervalValue: 500,
  currentValue: 1700,
  today: "2026-04-01",
  executions: [{ performedAt: "2025-06-01", valueAtService: 1000 }],
});
assert.equal(scenarioC.dueMilestoneValue, 1500);
assert.equal(scenarioC.nextMilestoneValue, 2000);
assert.ok(scenarioC.remainingValue < 0);
assert.equal(scenarioC.isOverdue, true);
assert.ok(scenarioC.intervalsCrossed >= 1);

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

console.log("ema-forecast.scenarios.test.ts OK");
