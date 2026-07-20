import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  REPORT_V2_NARRATIVE_SERVER_ENV,
  resolveReportV2NarrativeEnabled,
  resolveReportV2NarrativeEnabledClient,
} from "@/lib/feature-flags/report-v2-flag";

const adapterSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/use-report-ai-analysis-source.ts"),
  "utf8",
);
const narrativeHookSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/use-report-narrative.ts"),
  "utf8",
);
const apiSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/api/report-narrative-api.ts"),
  "utf8",
);

assert.match(adapterSrc, /resolveReportV2NarrativeEnabledClient/);
assert.doesNotMatch(adapterSrc, /resolveReportV2NarrativeEnabled\(/);
assert.match(narrativeHookSrc, /if \(!enabled\) return/);
assert.match(adapterSrc, /enabled: narrativeEnabled/);

const prevServer = process.env[REPORT_V2_NARRATIVE_SERVER_ENV];
const prevClient = process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE;
delete process.env[REPORT_V2_NARRATIVE_SERVER_ENV];
delete process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE;

try {
  assert.equal(resolveReportV2NarrativeEnabled(), true, "default server ON");
  assert.equal(resolveReportV2NarrativeEnabledClient(), true, "default client ON");

  process.env[REPORT_V2_NARRATIVE_SERVER_ENV] = "false";
  assert.equal(resolveReportV2NarrativeEnabled(), false, "server kill switch");
  assert.match(
    apiSrc,
    /resolveReportV2NarrativeEnabled\(\)[\s\S]*status: 404/,
    "API returns 404 when server flag off",
  );

  delete process.env[REPORT_V2_NARRATIVE_SERVER_ENV];
  process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE = "false";
  assert.equal(resolveReportV2NarrativeEnabledClient(), false, "client kill → legacy path");
  assert.match(narrativeHookSrc, /fetch\(`\/api\/report\/narrative/);
  assert.match(narrativeHookSrc, /if \(!enabled\) return/);
} finally {
  if (prevServer === undefined) delete process.env[REPORT_V2_NARRATIVE_SERVER_ENV];
  else process.env[REPORT_V2_NARRATIVE_SERVER_ENV] = prevServer;
  if (prevClient === undefined) delete process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE;
  else process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE = prevClient;
}

console.log("report-v2-kill-switch.integration.test.ts OK");
