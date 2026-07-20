import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const serviceSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/services/narrative-service.server.ts"),
  "utf8",
);

function indexOfOrFail(haystack: string, needle: string): number {
  const idx = haystack.indexOf(needle);
  assert.ok(idx >= 0, `expected ${needle} in narrative-service`);
  return idx;
}

const flagIdx = indexOfOrFail(serviceSrc, "resolveReportV2NarrativeEnabled");
const rateIdx = indexOfOrFail(serviceSrc, "isNarrativeRateLimited");
const configuredIdx = indexOfOrFail(serviceSrc, "isConfigured");
const generateIdx = indexOfOrFail(serviceSrc, "geminiNarrativeProvider.generate");

assert.ok(flagIdx < rateIdx, "flag check before rate limit");
assert.ok(rateIdx < configuredIdx, "rate limit before isConfigured");
assert.ok(configuredIdx < generateIdx, "isConfigured before generate");

console.log("narrative-service-order.test.ts OK");
