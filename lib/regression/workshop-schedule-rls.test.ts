import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260905120000_workshop_schedule_events.sql"),
  "utf8",
);

assert.match(migration, /workshop_schedule_events/);
assert.match(migration, /cap_wse_select/);
assert.match(migration, /cab_list_workshop_schedule_events/);
assert.match(migration, /ERR_SCHEDULE_OVERLAP/);

console.log("workshop-schedule-rls.test.ts OK");
