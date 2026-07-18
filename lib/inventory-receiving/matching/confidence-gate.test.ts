import assert from "node:assert/strict";
import {
  defaultLineActionWithGate,
  lineRequiresReview,
} from "@/lib/inventory-receiving/matching/confidence-gate";

assert.equal(lineRequiresReview({ matchStatus: "FOUND", matchConfidence: 1, method: "CODE" }), false);
assert.equal(
  lineRequiresReview({ matchStatus: "SUGGESTED", matchConfidence: 0.9, method: "DESCRIPTION_AI" }),
  true,
);
assert.equal(defaultLineActionWithGate("NEW_ITEM", 0.4, "DESCRIPTION_AI"), "create");
assert.equal(defaultLineActionWithGate("FOUND", 1, "CODE"), "add");

console.log("confidence-gate.test.ts OK");
