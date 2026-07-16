import assert from "node:assert/strict";
import {
  formatCaptureAnalyzeErrorMessage,
  formatRetryCountdownLabel,
  GEMINI_API_USAGE_URL,
  isGeminiQuotaErrorMessage,
  parseGeminiRetryAfterSec,
} from "@/lib/ai/gemini-retry-after";

const sample =
  "Failed after 3 attempts. Last error: You exceeded your current quota. * Quota exceeded * Please retry in 32.097866725s.";

assert.equal(parseGeminiRetryAfterSec(sample), 33);
assert.equal(parseGeminiRetryAfterSec("Please retry in 5s"), 5);
assert.equal(parseGeminiRetryAfterSec("no retry hint"), null);
assert.equal(isGeminiQuotaErrorMessage(sample), true);
assert.match(formatCaptureAnalyzeErrorMessage(sample), /quota Gemini/i);
assert.equal(GEMINI_API_USAGE_URL, "https://aistudio.google.com/usage");
assert.equal(formatRetryCountdownLabel(65), "1:05");
assert.equal(formatRetryCountdownLabel(9.2), "10 s");

console.log("gemini-retry-after.test.ts OK");
