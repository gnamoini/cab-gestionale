import assert from "node:assert/strict";

function deserializeBriefMode(raw: unknown, fallback: "day" | "week" | "month"): "day" | "week" | "month" {
  return raw === "day" || raw === "week" || raw === "month" ? raw : fallback;
}

assert.equal(deserializeBriefMode("day", "week"), "day");
assert.equal(deserializeBriefMode("week", "day"), "week");
assert.equal(deserializeBriefMode("month", "week"), "month");
assert.equal(deserializeBriefMode("year", "week"), "week");
assert.equal(deserializeBriefMode(undefined, "day"), "day");

console.log("brief-period-pref.test.ts OK");
