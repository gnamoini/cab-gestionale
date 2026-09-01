import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const migration = read("supabase/migrations/20261301120000_notification_inbox_eligible_ssot.sql");
const grants = read("supabase/migrations/20261301120100_notification_inbox_eligible_grants.sql");
const mount = read("components/gestionale/notification-center-mount.tsx");
const hook = read("src/hooks/gestionale/use-inbox-eligible.ts");
const center = read("src/hooks/gestionale/use-notification-center.ts");

assert.match(migration, /notification_inbox_eligible\(\)/);
assert.match(migration, /notification_staff_inbox_eligible\(\)/);
assert.match(migration, /notification_cliente_inbox_eligible\(\)/);
assert.match(migration, /notification_inbox_eligible\(\)/);
assert.match(migration, /cab_mark_notification_read/);
assert.match(migration, /notification_visible_to_auth_user\(v_n\)/);

assert.match(grants, /grant execute on function public\.notification_inbox_eligible\(\) to authenticated/);

assert.match(hook, /notification_inbox_eligible/);
assert.match(mount, /useInboxEligible/);
assert.doesNotMatch(mount, /isStaffInboxEligible/);
assert.doesNotMatch(center, /isStaffInboxEligible/);
assert.doesNotMatch(center, /markedAllOnOpenRef/);

console.log("inbox-eligible.test.ts OK");
