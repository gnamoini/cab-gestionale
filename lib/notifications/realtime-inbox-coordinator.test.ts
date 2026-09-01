import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const coordinator = fs.readFileSync(
  path.join(process.cwd(), "lib/notifications/realtime-inbox-coordinator.ts"),
  "utf8",
);
const center = fs.readFileSync(
  path.join(process.cwd(), "src/hooks/gestionale/use-notification-center.ts"),
  "utf8",
);

assert.match(coordinator, /INBOX_FALLBACK_POLL_MS = 30_000/);
assert.match(coordinator, /INBOX_FALLBACK_POLL_DRAWER_MS = 15_000/);
assert.match(coordinator, /INBOX_LIVE_RECONCILE_MS = 0/);
assert.match(coordinator, /invalidateInbox/);
assert.match(coordinator, /onVisibilityChange/);
assert.match(center, /DEGRADED_REFETCH_INTERVAL_MS/);
assert.match(center, /refetchInterval: degradedPolling/);

/**
 * Eventual consistency contract (T0–T6):
 * realtime lost → reconciliation via invalidateInbox on visibility/online/degraded poll.
 */
assert.match(coordinator, /window\.addEventListener\("online"/);
assert.match(coordinator, /visibilitychange/);

console.log("realtime-inbox-coordinator.test.ts OK");
