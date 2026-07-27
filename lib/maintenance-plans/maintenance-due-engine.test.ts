import assert from "node:assert/strict";
import {
  evaluateConfigDue,
  formatDueReason,
  pickWinningTrigger,
} from "@/lib/maintenance-plans/maintenance-due-engine";

const due = evaluateConfigDue({
  groups: [
    {
      operator: "OR",
      sortOrder: 0,
      triggers: [
        { triggerType: "ore", threshold: 500, priority: 0 },
        { triggerType: "mesi", threshold: 12, priority: 1 },
      ],
    },
  ],
  intervalType: "ore",
  intervalValue: 500,
  currentValue: 480,
  executions: [{ performedAt: "2025-01-01", valueAtService: 0 }],
  today: "2026-01-01",
});

assert.ok(due.forecast);
assert.equal(pickWinningTrigger(due.explainability), due.explainability.trigger_reason);

const overdueLabel = formatDueReason({
  presetNome: "Tagliando 500h",
  explainability: due.explainability,
  currentValue: 520,
  remainingValue: -20,
  isOverdue: true,
});
assert.match(overdueLabel, /Tagliando 500h scaduto/);

const overdueKmLabel = formatDueReason({
  presetNome: "Tagliando km",
  explainability: {
    trigger_reason: "km",
    due_date: null,
    groups: [],
  },
  currentValue: 75636,
  remainingValue: -50636,
  isOverdue: true,
});
assert.match(overdueKmLabel, /limite 25000/);

const plannedLabel = formatDueReason({
  presetNome: "Tagliando 500h",
  explainability: {
    ...due.explainability,
    due_date: "2026-06-01",
    groups: due.explainability.groups.map((g) => ({
      ...g,
      alternatives: g.alternatives.map((a) => ({ ...a, isOverdue: false })),
    })),
  },
  currentValue: 200,
  remainingValue: 300,
  isOverdue: false,
});
assert.match(plannedLabel, /prossima scadenza/i);

console.log("maintenance-due-engine.test.ts OK");
