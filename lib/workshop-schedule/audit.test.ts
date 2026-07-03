import assert from "node:assert/strict";
import fs from "node:fs";
import { inferHistoryAction, planningSnapshot } from "@/lib/workshop-schedule/workshop-schedule-audit";

assert.equal(inferHistoryAction(null, { start_at: "a" }), "created");
assert.equal(inferHistoryAction({ start_at: "a" }, null), "deleted");

const before = planningSnapshot({ start_at: "a", end_at: "b", work_order_id: null });
const after = planningSnapshot({ start_at: "c", end_at: "b", work_order_id: null });
assert.equal(inferHistoryAction(before, after), "duration_changed");

const migration = fs.readFileSync(
  "supabase/migrations/20260905120000_workshop_schedule_events.sql",
  "utf8",
);
assert.match(migration, /workshop_schedule_history/);
assert.match(migration, /revision = revision \+ 1/);

console.log("audit.test.ts OK");
