import assert from "node:assert/strict";
import { DND_PATCH_ALLOWED_FIELDS, DND_PATCH_FORBIDDEN_FIELDS } from "@/lib/workshop-schedule/types";

assert.deepEqual(
  [...DND_PATCH_ALLOWED_FIELDS].sort(),
  ["end_at", "planning_status", "revision", "start_at", "updated_at"].sort(),
);
assert.ok(DND_PATCH_FORBIDDEN_FIELDS.includes("work_order_id"));

const migration = require("node:fs").readFileSync(
  "supabase/migrations/20260905120000_workshop_schedule_events.sql",
  "utf8",
);
assert.match(migration, /cab_patch_workshop_schedule_times/);
assert.match(migration, /planning_status = 'rescheduled'/);

console.log("agenda-dnd.test.ts OK");
