import assert from "node:assert/strict";
import {
  NOTIFICATION_EVENT_CATALOG,
  getNotificationEventDefinition,
} from "@/lib/notifications/notification-event-catalog";

assert.ok(NOTIFICATION_EVENT_CATALOG.length >= 8);
assert.equal(getNotificationEventDefinition("lavorazione_created")?.scopeType, "global");
assert.equal(getNotificationEventDefinition("preventivo_approvato")?.recipients.ufficio, true);
assert.equal(getNotificationEventDefinition("magazzino_sotto_scorta")?.recipients.officina, true);
assert.equal(getNotificationEventDefinition("lavorazione_completata")?.recipients.officina, false);

console.log("notification-event-catalog.test.ts OK");
