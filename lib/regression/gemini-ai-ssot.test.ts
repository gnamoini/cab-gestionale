import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const AI_FILES = [
  "lib/ai/report-analysis.ts",
  "lib/ai/listino-import-analysis.ts",
  "lib/ai/magazzino-categoria-classify.ts",
  "lib/ai/extraction/ai-extraction-service.ts",
  "lib/document-capture/analyze-capture.server.ts",
  "lib/document-capture/pipeline/analyze-capture-v41.server.ts",
  "lib/ordini-fornitori/import/ordine-fornitore-import-analysis.ts",
];

const FORBIDDEN = [
  /process\.env\.GEMINI_API_KEY/,
  /process\.env\.GOOGLE_GENERATIVE_AI_API_KEY/,
  /process\.env\.GOOGLE_API_KEY/,
  /process\.env\.GEMINI_API_KEY_SECONDARY/,
];

const FORBIDDEN_DIRECT_GENERATE = [
  /await\s+generateObject\s*\(\s*\{[^}]*model:\s*getGeminiReportModel/,
  /await\s+generateObject\s*\(\s*\{[^}]*model,\s*\n\s*schema/,
];

for (const rel of AI_FILES) {
  const abs = path.join(ROOT, rel);
  const src = fs.readFileSync(abs, "utf8");
  for (const re of FORBIDDEN) {
    assert.doesNotMatch(src, re, `${rel} must not read Gemini env vars directly (AI-SSOT-1)`);
  }
  assert.match(src, /gemini-client|gemini-generate-object/, `${rel} must import from Gemini SSOT`);
  assert.match(src, /generateObjectWithGeminiFailover/, `${rel} must use generateObjectWithGeminiFailover`);
  for (const re of FORBIDDEN_DIRECT_GENERATE) {
    assert.doesNotMatch(src, re, `${rel} must not call generateObject with getGeminiReportModel directly`);
  }
}

const geminiClient = fs.readFileSync(path.join(ROOT, "lib/ai/gemini-client.ts"), "utf8");
assert.match(geminiClient, /AI-SSOT-1/);
assert.match(geminiClient, /GEMINI_NOT_CONFIGURED_MESSAGE/);
assert.match(geminiClient, /GEMINI_FILE_ANALYSIS_TIMEOUT_MS/);
assert.match(geminiClient, /runWithGeminiApiKeysFailover/);
assert.match(geminiClient, /listGeminiApiKeys/);
assert.match(geminiClient, /resolveGeminiApiKeysFromEnv\(\)/);
assert.match(
  fs.readFileSync(path.join(ROOT, "lib/ai/gemini-api-keys.ts"), "utf8"),
  /resolveFromRuntimeProcessEnv/,
);
assert.match(geminiClient, /gemini-3\.5-flash/);

const geminiGenerate = fs.readFileSync(path.join(ROOT, "lib/ai/gemini-generate-object.server.ts"), "utf8");
assert.match(geminiGenerate, /runWithGeminiFailover/);

console.log("gemini-ai-ssot.test.ts OK");
