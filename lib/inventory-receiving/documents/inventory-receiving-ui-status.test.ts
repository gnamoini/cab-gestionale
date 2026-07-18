import assert from "node:assert/strict";
import {
  inventoryReceivingFlowStepFromDocument,
  inventoryReceivingStatusToUiStatus,
  inventoryReceivingUiStatusLabel,
} from "@/lib/inventory-receiving/documents/inventory-receiving-ui-status";

assert.equal(inventoryReceivingStatusToUiStatus("ANALYZING"), "PROCESSING");
assert.equal(inventoryReceivingStatusToUiStatus(null, "uploaded"), "QUEUED");
assert.equal(inventoryReceivingStatusToUiStatus("REVIEW_REQUIRED"), "REVIEW");
assert.equal(inventoryReceivingStatusToUiStatus("PARTIALLY_APPLIED"), "APPLIED");
assert.equal(inventoryReceivingUiStatusLabel("REVIEW"), "Revisione");
assert.equal(inventoryReceivingFlowStepFromDocument("REVIEW_REQUIRED"), "review");

console.log("inventory-receiving-ui-status.test.ts OK");
