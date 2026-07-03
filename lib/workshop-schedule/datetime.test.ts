import assert from "node:assert/strict";
import { ymdFromIso, spansMultipleLocalDays, sessionDurationMinutes } from "@/lib/workshop-schedule/datetime";

const iso = "2026-07-03T10:30:00.000Z";
assert.match(ymdFromIso(iso), /^\d{4}-\d{2}-\d{2}$/);
assert.equal(sessionDurationMinutes("2026-07-03T08:00:00.000Z", "2026-07-03T09:00:00.000Z"), 60);
assert.equal(typeof spansMultipleLocalDays("2026-07-03T22:00:00.000Z", "2026-07-04T01:00:00.000Z"), "boolean");

console.log("datetime.test.ts OK");
