import assert from "node:assert/strict";
import {
  buildGeminiResolverDiagnostics,
  buildRuntimeEnvCheckPayload,
  resolveConfigurationErrorType,
} from "@/lib/ai/gemini-env-diagnostics";
import {
  inspectGeminiKeyFormat,
  readRuntimeEnvVar,
  resolveGeminiApiKeysFromEnv,
  resolvePrimaryGeminiEnvSource,
} from "@/lib/ai/gemini-api-keys";

assert.deepEqual(
  resolveGeminiApiKeysFromEnv({
    GOOGLE_GENERATIVE_AI_API_KEY: "AIzaSyD-primary-key-1234567890",
    GEMINI_API_KEY: "AIzaSyD-secondary-priority-123456",
  }),
  ["AIzaSyD-primary-key-1234567890"],
);

assert.equal(
  resolvePrimaryGeminiEnvSource({
    GOOGLE_GENERATIVE_AI_API_KEY: "AIzaSyD-primary-key-1234567890",
    GEMINI_API_KEY: "other",
  }),
  "GOOGLE_GENERATIVE_AI_API_KEY",
);

assert.equal(
  resolveConfigurationErrorType({ configured: false, keyLength: 0, formatValid: false }),
  "CONFIG_NOT_FOUND",
);
assert.equal(
  resolveConfigurationErrorType({
    configured: true,
    keyLength: 0,
    formatValid: false,
  }),
  "CONFIG_EMPTY",
);
assert.equal(
  resolveConfigurationErrorType({
    configured: true,
    keyLength: 10,
    formatValid: false,
  }),
  "CONFIG_INVALID_FORMAT",
);

const saved = {
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  GEMINI_API_KEY_SECONDARY: process.env.GEMINI_API_KEY_SECONDARY,
};
process.env.GOOGLE_GENERATIVE_AI_API_KEY = "AIzaSyD-runtime-direct-lookup-key";
delete process.env.GEMINI_API_KEY_SECONDARY;
const runtimeKeys = resolveGeminiApiKeysFromEnv();
assert.equal(runtimeKeys.length >= 1, true);
assert.equal(runtimeKeys[0], "AIzaSyD-runtime-direct-lookup-key");
const diag = buildGeminiResolverDiagnostics();
assert.equal(diag.geminiKeysViaDirect, true);
assert.equal(diag.resolvedKeyCount >= 1, true);
if (saved.GOOGLE_GENERATIVE_AI_API_KEY === undefined) delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
else process.env.GOOGLE_GENERATIVE_AI_API_KEY = saved.GOOGLE_GENERATIVE_AI_API_KEY;
if (saved.GEMINI_API_KEY_SECONDARY === undefined) delete process.env.GEMINI_API_KEY_SECONDARY;
else process.env.GEMINI_API_KEY_SECONDARY = saved.GEMINI_API_KEY_SECONDARY;

assert.equal(inspectGeminiKeyFormat("AIzaSyD-example-key-1234567890").valid, true);
assert.equal(readRuntimeEnvVar("GOOGLE_GENERATIVE_AI_API_KEY", { GOOGLE_GENERATIVE_AI_API_KEY: " AIzaSyD-example-key-1234567890 " }), "AIzaSyD-example-key-1234567890");

const runtimePayload = buildRuntimeEnvCheckPayload();
assert.equal(typeof runtimePayload.envDetected, "object");
assert.equal(typeof runtimePayload.nodeVersion, "string");

console.log("gemini-resolver-runtime.test.ts OK");
