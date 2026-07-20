import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adapterSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/use-report-ai-analysis-source.ts"),
  "utf8",
);
const narrativeHookSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/use-report-narrative.ts"),
  "utf8",
);

assert.match(adapterSrc, /GeneratedNarrativeDto/);
assert.match(adapterSrc, /resolveReportV2NarrativeEnabledClient/);
assert.doesNotMatch(narrativeHookSrc, /providers\//);
assert.doesNotMatch(narrativeHookSrc, /quality\//);
assert.match(narrativeHookSrc, /generatedNarrativeDtoSchema/);
assert.ok(
  !narrativeHookSrc.includes("[enabled, fetchNarrative]"),
  "narrative must not auto-fetch on mount",
);

console.log("narrative-consumer-boundary.test.ts OK");
