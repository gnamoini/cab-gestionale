import assert from "node:assert/strict";
import { computeTriggerGroupForecast } from "@/lib/maintenance-plans/forecast/trigger-group-forecast";

const result = computeTriggerGroupForecast({
  groups: [
    {
      operator: "OR",
      sortOrder: 0,
      triggers: [
        { triggerType: "km", threshold: 30000, priority: 0 },
        { triggerType: "mesi", threshold: 12, priority: 1 },
      ],
    },
  ],
  intervalType: "km",
  intervalValue: 30000,
  currentValue: 32000,
  currentKm: 32000,
  executions: [{ performedAt: "2026-01-01", valueAtService: 1000 }],
  today: "2026-06-01",
});

assert.equal(result.explainability.trigger_reason, "km");
assert.equal(result.explainability.groups[0]!.alternatives.length, 2);
assert.ok(result.forecast.isOverdue);

console.log("trigger-group-forecast self-check ok");
