import assert from "node:assert/strict";
import { detectConflicts, hasHardConflict } from "@/lib/workshop-schedule/overlap-policy";

const base = {
  startAt: "2026-07-03T09:00:00.000Z",
  endAt: "2026-07-03T10:00:00.000Z",
  eventType: "intervento_programmato" as const,
};

const existingSame = [
  {
    id: "a",
    title: "A",
    workOrderId: "wo-1",
    planningStatus: "scheduled" as const,
    ...base,
  },
];

const sameWo = detectConflicts({ ...base, workOrderId: "wo-1" }, existingSame);
assert.ok(sameWo.some((c) => c.conflictType === "same_wo"));
assert.equal(hasHardConflict(sameWo), false);

const existingCross = [
  {
    id: "b",
    title: "B",
    workOrderId: "wo-2",
    planningStatus: "scheduled" as const,
    startAt: "2026-07-03T09:30:00.000Z",
    endAt: "2026-07-03T11:00:00.000Z",
    eventType: "intervento_programmato" as const,
  },
];

const crossWo = detectConflicts({ ...base, workOrderId: "wo-3" }, existingCross);
assert.ok(crossWo.some((c) => c.conflictType === "cross_wo"));
assert.equal(hasHardConflict(crossWo), true);

console.log("overlap-policy.test.ts OK");
