import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adapterSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/providers/gemini-adapter.ts"),
  "utf8",
);

const FORBIDDEN = [
  /\bevaluateInsightRules\b/,
  /\bINSIGHT_RULE_REGISTRY\b/,
  /\bbuildAnalyticsDatasetBundle\b/,
  /\bgeneratedNarrativeDtoSchema\b/,
  /\bInsightDto\b/,
];

for (const re of FORBIDDEN) {
  assert.doesNotMatch(adapterSrc, re, `gemini-adapter must not contain ${re}`);
}

assert.match(adapterSrc, /generatedNarrativeContentSchema/);
assert.match(adapterSrc, /NarrativePromptContext/);
assert.match(adapterSrc, /resolveNarrativeProviderTimeoutMs\(\)/);
assert.match(adapterSrc, /timeoutMs,/);
assert.match(adapterSrc, /validateGeneratedNarrative/);
assert.match(adapterSrc, /validateNarrativeQuality/);
assert.match(adapterSrc, /emitNarrativeQualityTelemetry/);
assert.match(adapterSrc, /buildGeneratedNarrativeDto/);

console.log("gemini-adapter-contract.test.ts OK");
