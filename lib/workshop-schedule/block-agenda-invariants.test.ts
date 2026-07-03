import assert from "node:assert/strict";
import fs from "node:fs";
import { validateBloccoAgendaShape } from "@/lib/workshop-schedule/invariants";

assert.equal(
  validateBloccoAgendaShape({
    eventType: "blocco_agenda",
    blockType: "ferie",
    workOrderId: null,
    planningStatus: "confirmed",
  }).ok,
  true,
);

assert.equal(
  validateBloccoAgendaShape({
    eventType: "blocco_agenda",
    blockType: "ferie",
    workOrderId: "wo-1",
    planningStatus: "confirmed",
  }).ok,
  false,
);

const migration = fs.readFileSync(
  "supabase/migrations/20260905120000_workshop_schedule_events.sql",
  "utf8",
);
assert.match(migration, /wse_block_shape/);

console.log("block-agenda-invariants.test.ts OK");
