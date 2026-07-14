import assert from "node:assert/strict";
import {
  NOTIFICATION_EVENT_CATALOG,
  getNotificationEventDefinition,
} from "@/lib/notifications/notification-event-catalog";

assert.ok(NOTIFICATION_EVENT_CATALOG.length >= 8);
assert.equal(getNotificationEventDefinition("client_portal_ingresso")?.recipients.cliente, true);
assert.equal(getNotificationEventDefinition("client_portal_ingresso")?.titleTemplate, "Nuova lavorazione");
assert.equal(getNotificationEventDefinition("lavorazione_created")?.scopeType, "role");
assert.equal(getNotificationEventDefinition("lavorazione_created")?.scopeValue, "operatore");
assert.equal(getNotificationEventDefinition("lavorazione_completata")?.recipients.officina, true);
assert.equal(getNotificationEventDefinition("lavorazione_completata")?.recipients.ufficio, false);
assert.equal(getNotificationEventDefinition("magazzino_sotto_scorta")?.recipients.officina, true);
assert.equal(getNotificationEventDefinition("dipendenti_presenze_reminder")?.recipients.ufficio, false);

console.log("notification-event-catalog.test.ts OK");
