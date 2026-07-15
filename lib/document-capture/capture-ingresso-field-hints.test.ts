import assert from "node:assert/strict";
import { countCaptureHintsNeedingReview } from "@/lib/document-capture/capture-ingresso-field-hints";

assert.equal(countCaptureHintsNeedingReview({}), 0);
assert.equal(
  countCaptureHintsNeedingReview({
    cliente: { tone: "ok" },
    targa: { tone: "suggested", suggestion: "AB123CD" },
  }),
  1,
);
assert.equal(
  countCaptureHintsNeedingReview({
    cliente: { tone: "ambiguous", candidates: [] },
    targa: { tone: "catalog", message: "Non in anagrafica" },
  }),
  2,
);

console.log("capture-ingresso-field-hints.test.ts OK");
