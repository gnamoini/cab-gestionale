import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const coordinator = readFileSync(
  resolve(import.meta.dirname, "../../lib/notifications/realtime-inbox-coordinator.ts"),
  "utf8",
);

assert.match(coordinator, /subscribePostgresChangesChannel/);
assert.doesNotMatch(coordinator, /buildPostgresChangesChannel/);

console.log("realtime-inbox-subscribe.test.ts OK");
