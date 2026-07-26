import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve("supabase/migrations/20261030120000_notification_event_preferences_ssot.sql"),
  "utf8",
);

assert.match(migration, /notification_event_preferences/);
assert.match(migration, /notification_event_id/);
assert.match(migration, /primary key \(user_id, company_id, notification_event_id\)/);
assert.match(migration, /notifications_dispatch_idempotency_uidx/);
assert.match(migration, /company_id, scope_type, scope_value, idempotency_key/);
assert.match(migration, /notification_dispatch_log/);
assert.match(migration, /dispatch_notification_event_id/);
assert.match(migration, /cab_dispatch_notifications_bulk/);
assert.match(migration, /@deprecated/);

console.log("notification-schema-hardening.test.ts OK");
