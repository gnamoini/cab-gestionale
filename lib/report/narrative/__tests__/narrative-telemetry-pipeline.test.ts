import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const emitSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/observability/emit-narrative-observability.ts"),
  "utf8",
);
const analysisEmitSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/report-analysis/emit-report-analysis-observability.ts"),
  "utf8",
);

assert.match(emitSrc, /consumerPath:\s*"narrative-v2"/);
assert.match(emitSrc, /tenantResolved/);
assert.match(analysisEmitSrc, /consumerPath:\s*"legacy-analysis"/);
assert.match(analysisEmitSrc, /report_analysis_completed/);

console.log("narrative-telemetry-pipeline.test.ts OK");
