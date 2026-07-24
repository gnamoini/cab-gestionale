import assert from "node:assert/strict";
import { getRecentActivities } from "@/lib/audit/get-recent-activities";
import type { LogModificaRow } from "@/src/types/supabase-tables";

const now = Date.parse("2026-07-24T12:00:00.000Z");

const rows: LogModificaRow[] = [
  {
    id: "1",
    entita: "lavorazioni",
    entita_id: "a",
    azione: "UPDATE",
    autore_id: "u",
    payload: { summary: { modifiche: ["Updated By: x"] } },
    created_at: "2026-07-24T11:00:00.000Z",
    event_type: "DATA_CHANGE",
  },
  {
    id: "2",
    entita: "lavorazioni",
    entita_id: "b",
    azione: "CLOSE",
    autore_id: "u",
    payload: {},
    created_at: "2026-07-24T10:30:00.000Z",
    event_type: "WORKFLOW_ACTION",
    title: "Chiusura",
  },
];

const items = getRecentActivities({ rows, limit: 10, now, minScore: 1 });
assert.ok(items.length >= 1);
assert.ok(items[0]!.score >= (items[items.length - 1]?.score ?? 0));

console.log("get-recent-activities.test.ts OK");
