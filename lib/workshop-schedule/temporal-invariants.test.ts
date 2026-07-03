import assert from "node:assert/strict";
import { validateTemporalRange, validateBloccoAgendaShape, MAX_SESSION_DURATION_MS } from "@/lib/workshop-schedule/invariants";

const start = "2026-07-03T08:00:00.000Z";
const end = "2026-07-03T10:00:00.000Z";
assert.equal(validateTemporalRange(start, end).ok, true);
assert.equal(validateTemporalRange(end, start).ok, false);

const tooLong = new Date(Date.parse(start) + MAX_SESSION_DURATION_MS + 1000).toISOString();
assert.equal(validateTemporalRange(start, tooLong).ok, false);

assert.equal(
  validateBloccoAgendaShape({
    eventType: "blocco_agenda",
    blockType: "pausa",
    workOrderId: null,
    planningStatus: "confirmed",
  }).ok,
  true,
);
assert.equal(
  validateBloccoAgendaShape({
    eventType: "blocco_agenda",
    blockType: null,
    workOrderId: null,
    planningStatus: "confirmed",
  }).ok,
  false,
);

console.log("temporal-invariants.test.ts OK");
