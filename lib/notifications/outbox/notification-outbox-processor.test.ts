import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const processor = fs.readFileSync(
  path.join(process.cwd(), "lib/notifications/outbox/notification-outbox-processor.server.ts"),
  "utf8",
);
const config = fs.readFileSync(
  path.join(process.cwd(), "lib/notifications/outbox/outbox-processor-config.ts"),
  "utf8",
);

assert.match(processor, /while \(true\)/, "drain loop");
assert.match(processor, /timeBudgetMs/);
assert.match(processor, /outbox_claimed/);
assert.match(processor, /outbox_drained/);
assert.match(processor, /cab_claim_notification_outbox_batch/);
assert.match(config, /OUTBOX_PROCESSOR_TIME_BUDGET_MS/);
assert.match(config, /OUTBOX_MAX_EVENTS_PER_INVOCATION/);

console.log("notification-outbox-processor.test.ts OK");
