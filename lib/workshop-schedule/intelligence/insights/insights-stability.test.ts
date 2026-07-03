import assert from "node:assert/strict";
import { computePlannerInsights } from "@/lib/workshop-schedule/intelligence/insights/compute-planner-insights";
import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";

function session(partial: Partial<WorkshopScheduleSessionView> & { id: string; startAt: string; endAt: string }): WorkshopScheduleSessionView {
  return {
    id: partial.id,
    title: partial.title ?? "Test",
    description: null,
    eventType: partial.eventType ?? "intervento_programmato",
    blockType: null,
    startAt: partial.startAt,
    endAt: partial.endAt,
    planningStatus: partial.planningStatus ?? "confirmed",
    priority: "media",
    workOrderId: partial.workOrderId ?? "wo-1",
    revision: 1,
    createdBy: "u1",
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T08:00:00.000Z",
    deletedAt: null,
    seriesId: null,
    recurrenceFrequency: null,
    recurrenceInterval: null,
    recurrenceUntil: null,
    legacyPromemoriaId: null,
    workOrder: null,
  };
}

const sessions = [
  session({ id: "a", startAt: "2026-07-02T08:00:00.000Z", endAt: "2026-07-02T09:00:00.000Z" }),
  session({ id: "b", startAt: "2026-07-04T14:00:00.000Z", endAt: "2026-07-04T15:00:00.000Z" }),
];

const dates = ["2026-07-02", "2026-07-03", "2026-07-04"];
const fixedNow = Date.parse("2026-07-10T12:00:00.000Z");

const run1 = computePlannerInsights(sessions, dates, undefined, fixedNow);
const run2 = computePlannerInsights(sessions, dates, undefined, fixedNow);

assert.deepEqual(run1, run2);
assert.ok(Array.isArray(run1));

console.log("insights-stability.test.ts OK");
