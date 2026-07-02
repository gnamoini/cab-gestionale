import assert from "node:assert/strict";
import {
  assertCaptureStatusTransition,
  InvalidCaptureStatusTransitionError,
  isCaptureStatus,
} from "@/lib/document-capture/capture-status";

assert.ok(isCaptureStatus("pending_upload"));
assertCaptureStatusTransition("pending_upload", "uploaded");
  assertCaptureStatusTransition("dry_run", "applying");
  assertCaptureStatusTransition("applying", "applied");
  assertCaptureStatusTransition("failed", "applying");

try {
  assertCaptureStatusTransition("uploaded", "pending_upload");
  assert.fail("expected throw");
} catch (e) {
  assert.ok(e instanceof InvalidCaptureStatusTransitionError);
  assert.equal(e.code, "invalid_status_transition");
}

console.log("capture-status.test.ts OK");
