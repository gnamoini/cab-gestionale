import assert from "node:assert/strict";
import {
  expandRecurrenceOccurrences,
  maxRecurrenceUntilYmd,
  validateRecurrenceInput,
} from "@/lib/dashboard/dashboard-promemoria-recurrence";

const weekly = expandRecurrenceOccurrences("2026-06-03", "weekly", 1, "2026-06-24");
assert.deepEqual(weekly, ["2026-06-03", "2026-06-10", "2026-06-17", "2026-06-24"]);

const monthly31 = expandRecurrenceOccurrences("2026-01-31", "monthly", 1, "2026-04-30");
assert.ok(monthly31.includes("2026-01-31"));
assert.ok(monthly31.includes("2026-02-28"));
assert.ok(monthly31.includes("2026-03-31"));

const cap = expandRecurrenceOccurrences("2026-01-01", "daily", 1, "2028-01-01");
assert.ok(cap.length <= 366);

assert.equal(maxRecurrenceUntilYmd("2026-06-15"), "2029-06-15");

const invalidUntil = validateRecurrenceInput("2026-06-15", "weekly", 1, "2026-06-01", true);
assert.equal(invalidUntil.ok, false);

const ok = validateRecurrenceInput("2026-06-03", "weekly", 1, "2026-06-24", true);
assert.equal(ok.ok, true);

console.log("dashboard-promemoria-recurrence.test.ts: ok");
