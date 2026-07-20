import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const apiSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/api/report-narrative-api.ts"),
  "utf8",
);

const FORBIDDEN = [
  /geminiNarrativeProvider/,
  /validateNarrativeQuality/,
  /NarrativeQualityReport/,
  /NarrativePromptContext/,
  /generatedNarrativeContentSchema/,
];

for (const re of FORBIDDEN) {
  assert.doesNotMatch(apiSrc, re, `narrative api must not reference ${re}`);
}

assert.match(apiSrc, /resolveNarrativeTenantContext/);
assert.match(apiSrc, /generateNarrativeFromAiContext/);
assert.match(apiSrc, /source:\s*"narrative-v2"/);
assert.match(apiSrc, /correlationId/);
assert.match(apiSrc, /generatedNarrativeDtoSchema/);

const FORBIDDEN_RESPONSE_KEYS = [
  "prompt",
  "provider",
  "quality",
  "claims",
  "telemetry",
  "checkedClaims",
  "rejectedClaims",
];

for (const key of FORBIDDEN_RESPONSE_KEYS) {
  assert.doesNotMatch(apiSrc, new RegExp(`["']${key}["']`), `must not expose ${key}`);
}

console.log("narrative-api-contract.test.ts OK");
