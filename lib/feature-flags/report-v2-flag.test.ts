import assert from "node:assert/strict";
import {
  isReportV2FlagConfigured,
  REPORT_V2_FLAGS,
  resolveReportV2ContractsEnabled,
  resolveReportV2NarrativeEnabled,
  resolveReportV2NarrativeEnabledClient,
} from "@/lib/feature-flags/report-v2-flag";

for (const flag of REPORT_V2_FLAGS) {
  assert.equal(isReportV2FlagConfigured(flag), true);
}
assert.equal(isReportV2FlagConfigured("reportV2Unknown"), false);

const envKeys = [
  "NEXT_PUBLIC_REPORT_V2_CONTRACTS",
  "NEXT_PUBLIC_REPORT_V2_DATASETS",
  "NEXT_PUBLIC_REPORT_V2_EXECUTIVE",
  "NEXT_PUBLIC_REPORT_V2_DOMAIN_DTO",
  "NEXT_PUBLIC_REPORT_V2_SECTIONS",
  "NEXT_PUBLIC_REPORT_V2_INSIGHTS",
  "NEXT_PUBLIC_REPORT_V2_AI_CONTEXT",
  "NEXT_PUBLIC_REPORT_V2_NARRATIVE",
  "REPORT_V2_NARRATIVE",
] as const;

const prev: Record<string, string | undefined> = {};
for (const key of envKeys) {
  prev[key] = process.env[key];
  delete process.env[key];
}

try {
  assert.equal(resolveReportV2ContractsEnabled(null), false, "non-narrative default off");
  assert.equal(resolveReportV2NarrativeEnabled(), true, "server narrative default ON");
  assert.equal(resolveReportV2NarrativeEnabledClient(), true, "client narrative default ON");

  process.env.NEXT_PUBLIC_REPORT_V2_CONTRACTS = "1";
  assert.equal(resolveReportV2ContractsEnabled(null), true, "env on");
  assert.equal(resolveReportV2ContractsEnabled(false), true, "env wins db");

  process.env.NEXT_PUBLIC_REPORT_V2_CONTRACTS = "0";
  assert.equal(resolveReportV2ContractsEnabled(true), false, "env off wins db");

  process.env.REPORT_V2_NARRATIVE = "false";
  assert.equal(resolveReportV2NarrativeEnabled(), false, "server env kill switch");
} finally {
  for (const key of envKeys) {
    if (prev[key] === undefined) delete process.env[key];
    else process.env[key] = prev[key];
  }
}

console.log("report-v2-flag.test.ts OK");
