import assert from "node:assert/strict";
import {
  geminiKeySlotForIndex,
  isGeminiFailoverError,
  isGeminiModelUnavailableError,
  normalizeGeminiReportModelId,
  resolveGeminiApiKeysFromEnv,
  runWithGeminiApiKeysFailover,
} from "@/lib/ai/gemini-api-keys";

const GEMINI_REPORT_MODEL_ID = "gemini-3.5-flash";

assert.deepEqual(
  resolveGeminiApiKeysFromEnv({
    GEMINI_API_KEY: "primary-key",
    GEMINI_API_KEY_SECONDARY: "secondary-key",
  }),
  ["primary-key", "secondary-key"],
);

assert.deepEqual(
  resolveGeminiApiKeysFromEnv({
    GOOGLE_GENERATIVE_AI_API_KEY: "same",
    GEMINI_API_KEY_SECONDARY: "same",
  }),
  ["same"],
);

assert.deepEqual(
  resolveGeminiApiKeysFromEnv({
    GOOGLE_API_KEY: "only",
  }),
  ["only"],
);

const savedPrimary = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const savedSecondary = process.env.GEMINI_API_KEY_SECONDARY;
process.env.GOOGLE_GENERATIVE_AI_API_KEY = "runtime-primary";
process.env.GEMINI_API_KEY_SECONDARY = "runtime-secondary";
assert.deepEqual(resolveGeminiApiKeysFromEnv(), ["runtime-primary", "runtime-secondary"]);
if (savedPrimary === undefined) delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
else process.env.GOOGLE_GENERATIVE_AI_API_KEY = savedPrimary;
if (savedSecondary === undefined) delete process.env.GEMINI_API_KEY_SECONDARY;
else process.env.GEMINI_API_KEY_SECONDARY = savedSecondary;

assert.equal(geminiKeySlotForIndex(0), "primary");
assert.equal(geminiKeySlotForIndex(1), "secondary");

assert.equal(isGeminiFailoverError(new Error("429 quota exceeded")), true);
assert.equal(isGeminiFailoverError(new Error("401 API KEY invalid")), true);
assert.equal(isGeminiFailoverError(new Error("TimeoutError")), false);

assert.equal(
  normalizeGeminiReportModelId("gemini-2.5-flash", GEMINI_REPORT_MODEL_ID),
  "gemini-3.5-flash",
);
assert.equal(
  normalizeGeminiReportModelId("gemini-3.5-flash", GEMINI_REPORT_MODEL_ID),
  "gemini-3.5-flash",
);
assert.equal(
  normalizeGeminiReportModelId(null, GEMINI_REPORT_MODEL_ID),
  "gemini-3.5-flash",
);
assert.equal(
  isGeminiModelUnavailableError(
    new Error("models/gemini-2.5-flash is no longer available to new users"),
  ),
  true,
);

let attempts = 0;
void runWithGeminiApiKeysFailover(["key-a", "key-b"], async (_key, meta) => {
  attempts += 1;
  if (meta.keyIndex === 0) throw new Error("429 RESOURCE_EXHAUSTED quota");
  return "ok-secondary";
})
  .then((result) => {
    assert.equal(result, "ok-secondary");
    assert.equal(attempts, 2);
    return assert.rejects(
      () =>
        runWithGeminiApiKeysFailover(["key-a", "key-b"], async () => {
          throw new Error("schema validation failed");
        }),
      /schema validation failed/,
    );
  })
  .then(() =>
    assert.rejects(
      () =>
        runWithGeminiApiKeysFailover(["key-a", "key-b"], async () => {
          throw new Error("429 quota");
        }),
      /429 quota/,
    ),
  )
  .then(() => {
    console.log("gemini-failover.test.ts OK");
  });
