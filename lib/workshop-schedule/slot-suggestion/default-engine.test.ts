import assert from "node:assert/strict";
import { defaultScheduleSuggestionEngine } from "@/lib/workshop-schedule/slot-suggestion/default-engine";
import { computeDayCapacity } from "@/lib/workshop-schedule/day-capacity";

const slots = defaultScheduleSuggestionEngine.suggest({
  durationMinutes: 60,
  dayYmd: "2026-07-03",
  existingSessions: [],
  dayCapacity: computeDayCapacity("2026-07-03", []),
});
assert.ok(slots.length > 0);
for (let i = 1; i < slots.length; i++) {
  assert.ok(slots[i - 1].slotScore >= slots[i].slotScore);
}
assert.ok(slots.every((s) => s.slotScore >= 0 && s.slotScore <= 100));

console.log("default-engine.test.ts OK");
