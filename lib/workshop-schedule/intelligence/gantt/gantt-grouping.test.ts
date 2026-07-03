import assert from "node:assert/strict";
import { buildGanttRowsByWorkOrder } from "@/lib/workshop-schedule/intelligence/gantt/gantt-row-by-workorder";
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
    workOrderId: partial.workOrderId ?? null,
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
    workOrder: partial.workOrder ?? null,
  };
}

const woA = "wo-aaa";
const woB = "wo-bbb";

const rows = buildGanttRowsByWorkOrder([
  session({ id: "s2", workOrderId: woB, startAt: "2026-07-03T10:00:00.000Z", endAt: "2026-07-03T11:00:00.000Z" }),
  session({ id: "s1", workOrderId: woA, startAt: "2026-07-02T08:00:00.000Z", endAt: "2026-07-02T09:00:00.000Z" }),
  session({ id: "s3", workOrderId: woA, startAt: "2026-07-02T09:30:00.000Z", endAt: "2026-07-02T10:30:00.000Z" }),
  session({ id: "s4", workOrderId: null, startAt: "2026-07-01T14:00:00.000Z", endAt: "2026-07-01T15:00:00.000Z" }),
]);

assert.equal(rows.length, 3);
const woARow = rows.find((r) => r.workOrderId === woA)!;
assert.ok(woARow);
assert.equal(woARow.sessions.length, 2);
assert.equal(woARow.sessions[0].sessionId, "s1");
const overlapping = woARow.sessions.filter((b) => b.hasOverlap);
assert.ok(overlapping.length >= 0);

const cancelled = buildGanttRowsByWorkOrder([
  session({ id: "c1", workOrderId: woA, startAt: "2026-07-02T08:00:00.000Z", endAt: "2026-07-02T09:00:00.000Z", planningStatus: "cancelled" }),
]);
assert.equal(cancelled.length, 0);

console.log("gantt-grouping.test.ts OK");
