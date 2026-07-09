import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const AI_FILES = [
  "lib/ai/report-analysis.ts",
  "lib/ai/listino-import-analysis.ts",
  "lib/document-capture/analyze-capture.server.ts",
  "lib/ordini-fornitori/import/ordine-fornitore-import-analysis.ts",
];

const FORBIDDEN = [
  /process\.env\.GEMINI_API_KEY/,
  /process\.env\.GOOGLE_GENERATIVE_AI_API_KEY/,
  /process\.env\.GOOGLE_API_KEY/,
];

for (const rel of AI_FILES) {
  const abs = path.join(ROOT, rel);
  const src = fs.readFileSync(abs, "utf8");
  for (const re of FORBIDDEN) {
    assert.doesNotMatch(src, re, `${rel} must not read Gemini env vars directly (AI-SSOT-1)`);
  }
  assert.match(src, /gemini-client/, `${rel} must import from gemini-client`);
}

const geminiClient = fs.readFileSync(path.join(ROOT, "lib/ai/gemini-client.ts"), "utf8");
assert.match(geminiClient, /AI-SSOT-1/);
assert.match(geminiClient, /GEMINI_NOT_CONFIGURED_MESSAGE/);
assert.match(geminiClient, /GEMINI_FILE_ANALYSIS_TIMEOUT_MS/);

console.log("gemini-ai-ssot.test.ts OK");
