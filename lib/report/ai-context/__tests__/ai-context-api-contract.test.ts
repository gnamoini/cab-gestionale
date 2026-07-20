import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const apiSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/ai-context/api/report-ai-context-api.ts"),
  "utf8",
);

const routeSrc = fs.readFileSync(
  path.join(process.cwd(), "app/api/report/ai-context/route.ts"),
  "utf8",
);

const FORBIDDEN = [
  /gemini/i,
  /generative-ai/i,
  /buildNarrativePromptContext/,
  /report-cross-api/,
  /fetch\s*\(\s*["'`]\/api\/report\/cross-analysis/,
  /from\s+["']@\/lib\/report\/cross-analysis\/api/,
];

for (const re of FORBIDDEN) {
  assert.doesNotMatch(apiSrc, re, `report-ai-context-api must not contain: ${re}`);
}

assert.match(apiSrc, /resolveReportV2AiContextEnabled/);
assert.match(apiSrc, /verifyServerPageRead/);
assert.match(apiSrc, /buildReportAIContextDto/);
assert.match(apiSrc, /buildReportCrossDto/);
assert.match(routeSrc, /handleReportAiContextGet/);

console.log("ai-context-api-contract.test.ts OK");
