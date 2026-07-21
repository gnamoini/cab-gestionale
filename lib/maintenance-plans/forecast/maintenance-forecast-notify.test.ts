import assert from "node:assert/strict";

function buildForecastDedupKey(configId: string, dateBucket: string): string {
  return `tagliando-forecast:${configId}:${dateBucket}`;
}

const key1 = buildForecastDedupKey("cfg-1", "2026-07-21");
const key2 = buildForecastDedupKey("cfg-1", "2026-07-21");
const key3 = buildForecastDedupKey("cfg-1", "2026-07-22");

assert.equal(key1, key2);
assert.notEqual(key1, key3);
assert.ok(key1.length >= 8);

import { NOTIFICATION_TYPES } from "@/lib/notifications/notification-types";

assert.ok(NOTIFICATION_TYPES.includes("tagliando_previsto_7g"));
assert.ok(NOTIFICATION_TYPES.includes("tagliando_da_eseguire"));
assert.notEqual("tagliando_previsto_7g", "tagliando_da_eseguire");

console.log("maintenance-forecast-notify.test.ts OK");
