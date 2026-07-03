import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260905120000_workshop_schedule_events.sql", "utf8");
assert.doesNotMatch(migration, /work_order_id.*unique/i);
assert.match(migration, /idx_wse_work_order_active/);

console.log("work-order-sessions.test.ts OK");
