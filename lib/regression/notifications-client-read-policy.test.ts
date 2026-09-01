import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261301120000_notification_inbox_eligible_ssot.sql"),
  "utf8",
);

assert.match(migration, /notification_inbox_eligible\(\)/);
assert.match(migration, /cab_mark_notification_read/, "mark_read must use inbox_eligible guard");
assert.match(migration, /cab_mark_all_notifications_read/, "mark_all must use inbox_eligible guard");
assert.match(migration, /cab_dismiss_notification/, "dismiss must use inbox_eligible guard");
assert.match(migration, /notification_visible_to_auth_user\(v_n\)/, "single mark_read needs visibility");
assert.match(migration, /notification_visible_to_auth_user\(n\)/, "mark_all needs visibility in query");

const manifest = fs.readFileSync(
  path.join(ROOT, "docs/security/rpc-access-manifest.json"),
  "utf8",
);
assert.match(manifest, /"notification_inbox_eligible\(\)"/);

console.log("notifications-client-read-policy.test.ts OK");
