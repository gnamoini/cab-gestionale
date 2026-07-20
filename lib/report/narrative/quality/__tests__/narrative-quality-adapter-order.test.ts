import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adapterSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/providers/gemini-adapter.ts"),
  "utf8",
);

function indexOfOrFail(haystack: string, needle: string): number {
  const idx = haystack.indexOf(needle);
  assert.ok(idx >= 0, `expected ${needle} in gemini-adapter`);
  return idx;
}

const structIdx = indexOfOrFail(adapterSrc, "const validation = validateGeneratedNarrative");
const qualityIdx = indexOfOrFail(adapterSrc, "const quality = validateNarrativeQuality");
const enrichIdx = indexOfOrFail(adapterSrc, "data: buildGeneratedNarrativeDto");

assert.ok(structIdx < qualityIdx, "structural validation before quality");
assert.ok(qualityIdx < enrichIdx, "quality validation before enrich");

const qualityBlock = adapterSrc.slice(qualityIdx, enrichIdx);
assert.match(qualityBlock, /if \(!quality\.ok\)/, "quality failure returns before enrich");

console.log("narrative-quality-adapter-order.test.ts OK");
