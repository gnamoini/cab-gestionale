import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { cabSyncEntityFromTable } from "@/lib/sync/cab-sync-bus";

const ROOT = process.cwd();
const targetsSrc = fs.readFileSync(
  path.join(ROOT, "src/lib/react-query/invalidate-targets.ts"),
  "utf8",
);
const migrationSrc = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260705120000_gestionale_sync_realtime_gaps.sql"),
  "utf8",
);
const hookSrc = fs.readFileSync(
  path.join(ROOT, "src/hooks/use-dipendenti-timesheet.ts"),
  "utf8",
);

const syncTables = [
  "dipendenti_timesheet_employees",
  "dipendenti_timesheet_entries",
  "user_permissions",
] as const;

for (const table of syncTables) {
  assert.match(targetsSrc, new RegExp(`${table}:`), `invalidate-targets missing ${table}`);
  assert.ok(cabSyncEntityFromTable(table), `cab-sync entity missing: ${table}`);
  assert.match(migrationSrc, new RegExp(table), `realtime migration missing ${table}`);
}

assert.match(hookSrc, /dispatchTimesheetEntryChanged/);
assert.match(hookSrc, /dispatchTimesheetEmployeesChanged/);

console.log("sync-invalidation-policy.test.ts OK");
