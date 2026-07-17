import assert from "node:assert/strict";
import { isLabelJobStuck, resolveLabelJobStuckThresholdMs } from "@/lib/inventory-labels/jobs/label-job-recovery";

assert.equal(resolveLabelJobStuckThresholdMs(), 600_000);

const recent = new Date().toISOString();
assert.equal(isLabelJobStuck({ status: "running", heartbeat_at: recent }), false);

const stale = new Date(Date.now() - 700_000).toISOString();
assert.equal(isLabelJobStuck({ status: "running", heartbeat_at: stale }), true);
assert.equal(isLabelJobStuck({ status: "completed", heartbeat_at: stale }), false);
assert.equal(isLabelJobStuck({ status: "running", heartbeat_at: null }), true);

console.log("inventory-labels/jobs/label-job-recovery.test.ts OK");
