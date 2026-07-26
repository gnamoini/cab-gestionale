import assert from "node:assert/strict";
import { isNotificationEventEnabled } from "@/lib/notifications/preferences/notification-preference-resolver";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";

const entry = getNotificationRegistryEntry("magazzino.below_minimum")!;

assert.equal(
  isNotificationEventEnabled({
    notificationEventId: entry.notificationEventId,
    userId: "u1",
    companyId: "c1",
    entry,
    overrides: new Map(),
  }),
  true,
);

assert.equal(
  isNotificationEventEnabled({
    notificationEventId: entry.notificationEventId,
    userId: "u1",
    companyId: "c1",
    entry: { ...entry, defaultEnabled: false },
    overrides: new Map(),
  }),
  false,
);

assert.equal(
  isNotificationEventEnabled({
    notificationEventId: entry.notificationEventId,
    userId: "u1",
    companyId: "c1",
    entry,
    overrides: new Map([["u1:c1:magazzino.below_minimum", true]]),
  }),
  true,
);

console.log("notification-preference-resolver.test.ts OK");
