import assert from "node:assert/strict";
import { isTransientAnalyzeRetryError } from "@/lib/ai/gemini-analyze-retry-policy";
import { CaptureAnalyzeError } from "@/lib/document-capture/analyze-errors";

assert.equal(
  isTransientAnalyzeRetryError(
    new CaptureAnalyzeError({
      code: "AI_TIMEOUT",
      phase: "GEMINI_REQUEST",
      userMessage: "timeout",
      detail: "timeout",
    }),
  ),
  false,
);
assert.equal(
  isTransientAnalyzeRetryError(
    new CaptureAnalyzeError({
      code: "AI_RATE_LIMIT",
      phase: "GEMINI_REQUEST",
      userMessage: "429",
      detail: "429",
    }),
  ),
  true,
);
assert.equal(isTransientAnalyzeRetryError(new Error("ECONNRESET")), true);

console.log("gemini-analyze-retry-policy.test.ts OK");
