import assert from "node:assert/strict";
import { canTransitionInventoryDocument } from "@/lib/inventory-receiving/documents/inventory-receiving-status";

for (const status of ["UPLOADED", "ANALYZING", "REVIEW_REQUIRED", "READY_TO_APPLY", "PARTIALLY_APPLIED"] as const) {
  assert.equal(canTransitionInventoryDocument(status, "FAILED"), true, status);
}

assert.equal(canTransitionInventoryDocument("APPLIED", "FAILED"), false);
assert.equal(canTransitionInventoryDocument("FAILED", "FAILED"), true);

console.log("inventory-receiving-abandon.test.ts OK");
