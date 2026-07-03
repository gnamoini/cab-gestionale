import assert from "node:assert/strict";
import { computeDayCapacity } from "@/lib/workshop-schedule/day-capacity";

const cap = computeDayCapacity("2026-07-03", [
  {
    startAt: "2026-07-03T07:00:00.000Z",
    endAt: "2026-07-03T08:00:00.000Z",
    eventType: "intervento_programmato",
    planningStatus: "scheduled",
  },
]);
assert.equal(cap.dayBoundsMinutes, 720);
assert.ok(cap.plannedMinutes >= 0);
assert.ok(cap.saturationPct >= 0);

console.log("day-capacity.test.ts OK");
