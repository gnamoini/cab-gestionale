import assert from "node:assert/strict";
import {
  REPORT_V2_NARRATIVE_SERVER_ENV,
  resolveReportV2NarrativeEnabled,
} from "@/lib/feature-flags/report-v2-flag";

const prev = process.env[REPORT_V2_NARRATIVE_SERVER_ENV];
delete process.env[REPORT_V2_NARRATIVE_SERVER_ENV];
assert.equal(resolveReportV2NarrativeEnabled(), true, "default ON when server env unset");

process.env[REPORT_V2_NARRATIVE_SERVER_ENV] = "false";
assert.equal(resolveReportV2NarrativeEnabled(), false);

process.env[REPORT_V2_NARRATIVE_SERVER_ENV] = "true";
assert.equal(resolveReportV2NarrativeEnabled(), true);

if (prev === undefined) delete process.env[REPORT_V2_NARRATIVE_SERVER_ENV];
else process.env[REPORT_V2_NARRATIVE_SERVER_ENV] = prev;

console.log("narrative-service-flag.test.ts OK");
