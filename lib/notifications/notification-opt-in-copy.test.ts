import assert from "node:assert/strict";
import {
  notificationOptInContextLabel,
  notificationOptInDeniedMessage,
  notificationOptInDescription,
} from "@/lib/notifications/notification-opt-in-copy";

assert.equal(notificationOptInContextLabel("push"), "App sul telefono");
assert.equal(notificationOptInContextLabel("browser"), "Su questo browser");
assert.match(notificationOptInDescription("push"), /app chiusa/i);
assert.match(notificationOptInDescription("browser"), /altra scheda/i);
assert.match(notificationOptInDeniedMessage("push"), /telefono/i);
assert.match(notificationOptInDeniedMessage("browser"), /lucchetto/i);

console.log("notification-opt-in-copy.test.ts OK");
