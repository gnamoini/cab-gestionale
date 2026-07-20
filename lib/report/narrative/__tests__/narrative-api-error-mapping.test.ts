import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const apiSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/api/report-narrative-api.ts"),
  "utf8",
);

function indexOfOrFail(haystack: string, needle: string): number {
  const idx = haystack.indexOf(needle);
  assert.ok(idx >= 0, `expected ${needle}`);
  return idx;
}

const getHandlerMatch = apiSrc.match(
  /export async function handleReportNarrativeGet[\s\S]*?(?=export async function handleReportNarrativeConsumedPost|$)/,
);
assert.ok(getHandlerMatch, "handleReportNarrativeGet not found");
const getHandler = getHandlerMatch[0];

const rbacIdx = indexOfOrFail(getHandler, "verifyServerPageRead");
const sessionIdx = indexOfOrFail(getHandler, "resolveNarrativeTenantContext");
const flagIdx = indexOfOrFail(getHandler, "resolveReportV2NarrativeEnabled");
assert.ok(rbacIdx < sessionIdx, "RBAC before session");
assert.ok(sessionIdx < flagIdx, "session before flag");

assert.match(getHandler, /correlationId/);

assert.match(apiSrc, /function narrativeErrorStatus/);
assert.match(apiSrc, /case "rate_limited":[\s\S]*return 429/);
assert.match(apiSrc, /case "quality_failed":[\s\S]*return 422/);
assert.match(apiSrc, /case "validation_failed":[\s\S]*return 422/);

console.log("narrative-api-error-mapping.test.ts OK");
