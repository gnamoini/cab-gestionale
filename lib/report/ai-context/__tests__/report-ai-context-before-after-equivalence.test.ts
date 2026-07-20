import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const apiSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/ai-context/api/report-ai-context-api.ts"),
  "utf8",
);

const builderSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/ai-context/build-report-ai-context-for-period.ts"),
  "utf8",
);

assert.match(apiSrc, /buildReportAIContextForPeriod/);
assert.doesNotMatch(apiSrc, /buildAnalyticsDatasetBundle/, "pipeline moved to shared builder");
assert.doesNotMatch(apiSrc, /buildReportInsightsDto/, "pipeline moved to shared builder");

assert.match(builderSrc, /buildAnalyticsDatasetBundle/);
assert.match(builderSrc, /buildReportInsightsDto/);
assert.match(builderSrc, /buildReportAIContextDto/);

console.log("report-ai-context-before-after-equivalence.test.ts OK");
