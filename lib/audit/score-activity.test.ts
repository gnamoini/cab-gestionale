import assert from "node:assert/strict";
import { freshnessFactor, scoreActivity, baseActivityScore } from "@/lib/audit/score-activity";
import type { LogModificaRow } from "@/src/types/supabase-tables";

const now = Date.parse("2026-07-24T12:00:00.000Z");

assert.equal(freshnessFactor("2026-07-24T10:00:00.000Z", now), 1);
assert.ok(freshnessFactor("2026-06-24T12:00:00.000Z", now) < 1);
assert.ok(freshnessFactor("2026-04-24T12:00:00.000Z", now) <= 0.15);

const lavClose: LogModificaRow = {
  id: "1",
  entita: "lavorazioni",
  entita_id: "a",
  azione: "CLOSE",
  autore_id: "u",
  payload: {},
  created_at: "2026-07-24T10:00:00.000Z",
  event_type: "WORKFLOW_ACTION",
  title: "Chiusura lavorazione",
};

assert.ok(baseActivityScore(lavClose) >= 50);
assert.ok(scoreActivity(lavClose, now) >= 50);

const oldLav = { ...lavClose, created_at: "2026-04-01T10:00:00.000Z" };
assert.ok(scoreActivity(oldLav, now) < scoreActivity(lavClose, now));

console.log("score-activity.test.ts OK");
