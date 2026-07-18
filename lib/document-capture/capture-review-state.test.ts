import assert from "node:assert/strict";
import { resolveCaptureReviewState } from "@/lib/document-capture/capture-review-state";

const partial = resolveCaptureReviewState({
  reviewRequiredCount: 2,
  totalLines: 10,
  recognizedLines: 8,
});

assert.equal(partial.state, "partial_success");
assert.match(partial.message ?? "", /8\/10/);

const ready = resolveCaptureReviewState({
  reviewRequiredCount: 0,
  totalLines: 5,
});

assert.equal(ready.state, "ready");

const blocked = resolveCaptureReviewState({
  reviewRequiredCount: 0,
  totalLines: 3,
  blocked: true,
});

assert.equal(blocked.state, "blocked");

console.log("capture-review-state.test.ts OK");
