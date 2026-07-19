import assert from "node:assert/strict";
import {
  readNotificationOptInDecision,
  shouldShowNotificationMenuEnable,
  shouldShowNotificationOptInBanner,
  writeNotificationOptInDeclined,
  NOTIFICATION_OPT_IN_DECISION_KEY,
} from "@/lib/notifications/notification-opt-in-decision";

const storage = new Map<string, string>();

(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => {
    storage.set(k, v);
  },
  removeItem: (k) => {
    storage.delete(k);
  },
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
};

storage.clear();
assert.equal(readNotificationOptInDecision(), "pending");
assert.equal(
  shouldShowNotificationOptInBanner({ decision: "pending", canPrompt: true, isActive: false }),
  true,
);
assert.equal(
  shouldShowNotificationOptInBanner({ decision: "declined", canPrompt: true, isActive: false }),
  false,
);
writeNotificationOptInDeclined();
assert.equal(storage.get(NOTIFICATION_OPT_IN_DECISION_KEY), "declined");
assert.equal(readNotificationOptInDecision(), "declined");
assert.equal(shouldShowNotificationMenuEnable({ canPrompt: true, isActive: false }), true);

console.log("notification-opt-in-decision.test.ts OK");
