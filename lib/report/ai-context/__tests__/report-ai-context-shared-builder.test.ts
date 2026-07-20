import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const aiApi = fs.readFileSync(
  path.join(process.cwd(), "lib/report/ai-context/api/report-ai-context-api.ts"),
  "utf8",
);
const narrativeApi = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/api/report-narrative-api.ts"),
  "utf8",
);

assert.match(aiApi, /buildReportAIContextForPeriod/);
assert.match(narrativeApi, /buildReportAIContextForPeriod/);

console.log("report-ai-context-shared-builder.test.ts OK");
