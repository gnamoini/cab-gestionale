import assert from "node:assert/strict";
import { PLANNING_STATUS_LABELS, WORKSHOP_PLANNING_STATUSES } from "@/lib/workshop-schedule/types";

assert.ok(WORKSHOP_PLANNING_STATUSES.includes("scheduled"));
assert.ok(!("in_lavorazione" in PLANNING_STATUS_LABELS));
assert.equal(PLANNING_STATUS_LABELS.scheduled, "Da pianificare");

console.log("planning-status.test.ts OK");
