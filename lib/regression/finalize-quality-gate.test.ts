import assert from "node:assert/strict";
import { evaluateExtractionQuality } from "@/lib/ai/spare-parts/understanding/extraction-quality-gate";

const ready = evaluateExtractionQuality({
  partsExtracted: 120,
  pagesProcessed: 40,
  chunkSuccessRate: 1,
  partsWithPageEvidence: 100,
});
assert.equal(ready.understandingStatus, "ready");

const failed = evaluateExtractionQuality({
  partsExtracted: 0,
  pagesProcessed: 5,
  chunkSuccessRate: 1,
  partsWithPageEvidence: 0,
});
assert.equal(failed.understandingStatus, "failed");

const warn = evaluateExtractionQuality({
  partsExtracted: 2,
  pagesProcessed: 50,
  chunkSuccessRate: 0.9,
  partsWithPageEvidence: 2,
});
assert.equal(warn.understandingStatus, "ready_with_warnings");

console.log("finalize-quality-gate.test.ts OK");
