import assert from "node:assert/strict";
import { planAutoSchedule } from "@/lib/workshop-schedule/intelligence/auto-scheduler/plan-auto-schedule";
import { computeDayCapacity } from "@/lib/workshop-schedule/day-capacity";

const day = "2026-07-07";
const cap = computeDayCapacity(day, []);
const input = {
  workOrderId: "wo-test",
  estimatedDurationMinutes: 60,
  priority: "media" as const,
  searchDaysYmd: [day],
  existingSessions: [],
  dayCapacityByYmd: new Map([[day, cap]]),
};

const plan1 = planAutoSchedule(input);
const plan2 = planAutoSchedule(input);

assert.deepEqual(plan1, plan2);
assert.equal(plan1.work_order_id, "wo-test");
assert.ok(plan1.suggestedSessions.length >= 1);
assert.ok(plan1.suggestedSessions[0].slot_score >= 0);
assert.ok(plan1.suggestedSessions[0].confidence >= 0);

console.log("auto-scheduler-deterministic.test.ts OK");
