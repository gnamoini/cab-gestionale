import assert from "node:assert/strict";
import {
  REPORT_V2_NARRATIVE_SERVER_ENV,
  resolveReportV2NarrativeEnabled,
  resolveReportV2NarrativeEnabledClient,
} from "@/lib/feature-flags/report-v2-flag";

const prevServer = process.env[REPORT_V2_NARRATIVE_SERVER_ENV];
const prevClient = process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE;
delete process.env[REPORT_V2_NARRATIVE_SERVER_ENV];
delete process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE;

assert.equal(resolveReportV2NarrativeEnabled(), true);
assert.equal(resolveReportV2NarrativeEnabledClient(), true);

process.env[REPORT_V2_NARRATIVE_SERVER_ENV] = "false";
assert.equal(resolveReportV2NarrativeEnabled(), false);
process.env[REPORT_V2_NARRATIVE_SERVER_ENV] = "true";
assert.equal(resolveReportV2NarrativeEnabled(), true);

process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE = "false";
assert.equal(resolveReportV2NarrativeEnabledClient(), false);
process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE = "true";
assert.equal(resolveReportV2NarrativeEnabledClient(), true);

if (prevServer === undefined) delete process.env[REPORT_V2_NARRATIVE_SERVER_ENV];
else process.env[REPORT_V2_NARRATIVE_SERVER_ENV] = prevServer;
if (prevClient === undefined) delete process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE;
else process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE = prevClient;

console.log("narrative-api-rbac.test.ts OK");
