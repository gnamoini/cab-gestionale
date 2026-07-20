import assert from "node:assert/strict";
import {
  GOOGLE_HEALTH_CHECK_MODEL_DEFAULT,
  GOOGLE_HEALTH_CHECK_TIMEOUT_MS,
  resolveGoogleHealthCheckModelId,
} from "@/lib/ai/runtime/google-health-check-config";
import { mapErrorToKeyStatus } from "@/lib/ai/runtime/key-manager";

assert.equal(GOOGLE_HEALTH_CHECK_MODEL_DEFAULT, "gemini-3.1-flash-lite");
assert.ok(GOOGLE_HEALTH_CHECK_TIMEOUT_MS >= 30_000);
assert.equal(resolveGoogleHealthCheckModelId(), GOOGLE_HEALTH_CHECK_MODEL_DEFAULT);
assert.equal(mapErrorToKeyStatus("AI_TIMEOUT"), "degraded");

console.log("google-health-check.test.ts OK");
