import assert from "node:assert/strict";
import {
  REPORT_V2_NARRATIVE_SERVER_ENV,
  resolveReportV2NarrativeEnabled,
  resolveReportV2NarrativeEnabledClient,
  resolveReportV2ContractsEnabled,
} from "@/lib/feature-flags/report-v2-flag";

const envKeys = [
  "NEXT_PUBLIC_REPORT_V2_NARRATIVE",
  REPORT_V2_NARRATIVE_SERVER_ENV,
] as const;

const prev: Record<string, string | undefined> = {};
for (const key of envKeys) {
  prev[key] = process.env[key];
  delete process.env[key];
}

try {
  assert.equal(resolveReportV2NarrativeEnabled(), true, "server default ON");
  assert.equal(resolveReportV2NarrativeEnabledClient(), true, "client default ON");
  assert.equal(resolveReportV2ContractsEnabled(null), false, "other flags default off");

  process.env[REPORT_V2_NARRATIVE_SERVER_ENV] = "false";
  assert.equal(resolveReportV2NarrativeEnabled(), false, "server kill switch");
  assert.equal(resolveReportV2NarrativeEnabledClient(), true, "client independent");

  delete process.env[REPORT_V2_NARRATIVE_SERVER_ENV];
  process.env.NEXT_PUBLIC_REPORT_V2_NARRATIVE = "false";
  assert.equal(resolveReportV2NarrativeEnabledClient(), false, "client kill switch");
  assert.equal(resolveReportV2NarrativeEnabled(), true, "server still default ON");

  process.env[REPORT_V2_NARRATIVE_SERVER_ENV] = "false";
  assert.equal(resolveReportV2NarrativeEnabled(), false);
  assert.equal(resolveReportV2NarrativeEnabledClient(), false, "full rollback both false");
} finally {
  for (const key of envKeys) {
    if (prev[key] === undefined) delete process.env[key];
    else process.env[key] = prev[key];
  }
}

console.log("report-v2-rollout-config.test.ts OK");
