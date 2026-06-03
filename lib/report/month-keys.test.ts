import assert from "node:assert/strict";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import { monthKeyFromIso, monthKeysOverlappingRange, ymKey } from "@/lib/report/month-keys";

assert.equal(monthKeyFromIso("2025-03-10T12:00:00.000Z"), "2025-03");
assert.equal(ymKey(2025, 2), "2025-03");

const range = {
  start: startOfLocalDay(new Date(2025, 0, 1)),
  end: endOfLocalDay(new Date(2025, 2, 31)),
};
assert.deepEqual(monthKeysOverlappingRange(range), ["2025-01", "2025-02", "2025-03"]);

console.log("month-keys.test.ts OK");
