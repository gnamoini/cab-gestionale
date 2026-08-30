import assert from "node:assert/strict";
import { evaluateExtractionQuality } from "@/lib/ai/spare-parts/understanding/extraction-quality-gate";
import { oemTripleFromRaw } from "@/lib/ai/spare-parts/retrieval/oem-code-normalize";

/** Invariant: ready ⇒ searchable prerequisites (parts + page evidence + chunk rate). */
function assertReadyImpliesSearchable(input: {
  partsExtracted: number;
  pagesProcessed: number;
  chunkSuccessRate: number;
  partsWithPageEvidence: number;
}): void {
  const quality = evaluateExtractionQuality(input);
  assert.notEqual(quality.understandingStatus, "failed");
  assert.ok(input.partsExtracted > 0);
  assert.ok(input.partsWithPageEvidence > 0);
  assert.ok(input.chunkSuccessRate >= 0.5);
  const triple = oemTripleFromRaw("OEM-999");
  assert.ok(triple.partNumberSearch);
}

assertReadyImpliesSearchable({
  partsExtracted: 10,
  pagesProcessed: 3,
  chunkSuccessRate: 1,
  partsWithPageEvidence: 10,
});

const failed = evaluateExtractionQuality({
  partsExtracted: 5,
  pagesProcessed: 2,
  chunkSuccessRate: 1,
  partsWithPageEvidence: 0,
});
assert.equal(failed.understandingStatus, "failed");

console.log("spare-parts-searchable-ready.test.ts OK");
