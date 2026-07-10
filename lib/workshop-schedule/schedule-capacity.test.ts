import assert from "node:assert/strict";
import { computeScheduleCapacity } from "@/lib/workshop-schedule/schedule-capacity";

const sessions = [
  {
    startAt: "2026-07-03T07:00:00.000Z",
    endAt: "2026-07-03T08:00:00.000Z",
    eventType: "intervento_programmato" as const,
    planningStatus: "scheduled" as const,
  },
  {
    startAt: "2026-07-04T09:00:00.000Z",
    endAt: "2026-07-04T10:00:00.000Z",
    eventType: "intervento_programmato" as const,
    planningStatus: "scheduled" as const,
  },
];

const cap = computeScheduleCapacity({ sessions, dayYmd: "2026-07-03" });
assert.equal(cap.dayYmd, "2026-07-03");
assert.ok(cap.plannedMinutes > 0);

const empty = computeScheduleCapacity({ sessions, dayYmd: "2026-01-01" });
assert.equal(empty.plannedMinutes, 0);

console.log("schedule-capacity.test.ts OK");
