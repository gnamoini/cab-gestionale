import assert from "node:assert/strict";
import {
  formatCaptureAnalyzeErrorMessage,
  formatRetryCountdownLabel,
  GEMINI_API_USAGE_URL,
  isGeminiModelUnavailableMessage,
  isGeminiQuotaErrorMessage,
  parseGeminiRetryAfterSec,
  resolveGeminiAnalyzeRetryDelayMs,
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

const modelUnavailable =
  "This model models/gemini-2.5-flash is no longer available to new users.";
assert.equal(isGeminiModelUnavailableMessage(modelUnavailable), true);
assert.match(formatCaptureAnalyzeErrorMessage(modelUnavailable), /gemini-3\.5-flash/);
assert.equal(resolveGeminiAnalyzeRetryDelayMs(new Error(sample), 0), 33_000);
assert.equal(resolveGeminiAnalyzeRetryDelayMs(new Error("schema error"), 0), 1_000);

console.log("gemini-retry-after.test.ts OK");
