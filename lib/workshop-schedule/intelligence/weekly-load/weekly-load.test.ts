import assert from "node:assert/strict";
import { computeWeeklyLoad, clearWeeklyLoadCache } from "@/lib/workshop-schedule/intelligence/weekly-load/compute-weekly-load";

clearWeeklyLoadCache();

const weekStart = "2026-07-07";
const sessions = [
  {
    startAt: "2026-07-07T08:00:00.000Z",
    endAt: "2026-07-07T10:00:00.000Z",
    eventType: "intervento_programmato" as const,
    planningStatus: "confirmed" as const,
  },
  {
    startAt: "2026-07-08T09:00:00.000Z",
    endAt: "2026-07-08T11:00:00.000Z",
    eventType: "intervento_programmato" as const,
    planningStatus: "confirmed" as const,
  },
];

const snap = computeWeeklyLoad(sessions, weekStart);
assert.ok(snap.weekRange.includes(weekStart));
assert.equal(snap.dailyBreakdown.length, 7);
assert.ok(snap.totalPlannedHours > 0);

const cached = computeWeeklyLoad(sessions, weekStart, undefined, `${weekStart}|fp`);
assert.deepEqual(cached.dailyBreakdown, snap.dailyBreakdown);

console.log("weekly-load.test.ts OK");
