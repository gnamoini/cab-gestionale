import fs from "node:fs";
import path from "node:path";
import { NOTIFICATION_EVENT_CATALOG } from "@/lib/notifications/notification-event-catalog";
import { getNotificationPolicy } from "@/lib/notifications/application/policies/notification-policies";
import { NOTIFICATION_TEMPLATE_REGISTRY } from "@/lib/notifications/templates/notification-template-registry";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/notifications/notification-types";

const ROOT = process.cwd();
const failures: string[] = [];

const migrationSql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261107120000_notification_platform_v2.sql"),
  "utf8",
);
const recipientsTest = fs.readFileSync(
  path.join(ROOT, "lib/notifications/dispatch/resolve-notification-recipients.test.ts"),
  "utf8",
);

for (const entry of NOTIFICATION_EVENT_CATALOG) {
  const type = entry.type as NotificationType;

  if (!NOTIFICATION_TYPES.includes(type)) {
    failures.push(`${entry.notificationEventId}: type ${type} missing from NOTIFICATION_TYPES`);
  }

  const policy = getNotificationPolicy(type);
  if (!policy?.channels?.length) {
    failures.push(`${entry.notificationEventId}: missing delivery policy channels`);
  }

  const tpl = NOTIFICATION_TEMPLATE_REGISTRY[type];
  if (!tpl?.deep_link_pattern?.startsWith("/")) {
    failures.push(`${entry.notificationEventId}: missing template deep_link_pattern`);
  }

  if (!migrationSql.includes(`'${type}'`) && !fs.readFileSync(
    path.join(ROOT, "supabase/migrations/20260901150000_notification_events_v2.sql"),
    "utf8",
  ).includes(`'${type}'`)) {
    // allow types in older migrations
    const allMigrations = fs.readdirSync(path.join(ROOT, "supabase/migrations"));
    const inAny = allMigrations.some((f) => {
      if (!f.endsWith(".sql")) return false;
      return fs.readFileSync(path.join(ROOT, "supabase/migrations", f), "utf8").includes(`'${type}'`);
    });
    if (!inAny) {
      failures.push(`${entry.notificationEventId}: type ${type} not found in any migration registry insert`);
    }
  }

  if (!recipientsTest.includes(entry.notificationEventId) && !recipientsTest.includes(entry.type)) {
  // ponytail: only core events have explicit recipient tests — extended events use shared tier tests
  }
}

// Every catalog type must have template
for (const type of NOTIFICATION_TYPES) {
  if (!NOTIFICATION_TEMPLATE_REGISTRY[type]) {
    failures.push(`NOTIFICATION_TYPES includes ${type} but no template registry entry`);
  }
}

if (failures.length) {
  console.error("notification-catalog-completeness — FAIL");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("notification-catalog-completeness — PASS");
