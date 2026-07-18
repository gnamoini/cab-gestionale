import assert from "node:assert/strict";
import {
  computeDocumentAiConfidence,
  needsCautionReview,
} from "@/lib/inventory-receiving/extraction/compute-document-confidence";

const high = computeDocumentAiConfidence({
  document_confidence: 0.96,
  items: [{ description: "x", confidence: 0.98 }],
});
assert.ok(high >= 0.9);

const low = computeDocumentAiConfidence({
  items: [{ description: "x", confidence: 0.4 }],
});
assert.ok(needsCautionReview(low));

console.log("compute-document-confidence.test: OK");
