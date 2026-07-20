import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const apiSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/insights/api/report-insights-api.ts"),
  "utf8",
);

const FORBIDDEN = [
  /report-cross-api/,
  /fetch\s*\(\s*["'`]\/api\/report\/cross-analysis/,
  /from\s+["']@\/lib\/report\/cross-analysis\/api/,
];

for (const re of FORBIDDEN) {
  assert.doesNotMatch(apiSrc, re, `report-insights-api must not use cross HTTP: ${re}`);
}

assert.match(apiSrc, /buildReportCrossDto/);
assert.match(apiSrc, /buildReportInsightsDto/);

console.log("insight-api-no-cross-http.test.ts OK");
