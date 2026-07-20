import assert from "node:assert/strict";
import { resolveReportV2InsightsEnabled } from "@/lib/feature-flags/report-v2-flag";

const prev = process.env.NEXT_PUBLIC_REPORT_V2_INSIGHTS;
process.env.NEXT_PUBLIC_REPORT_V2_INSIGHTS = "false";
assert.equal(resolveReportV2InsightsEnabled(), false);

process.env.NEXT_PUBLIC_REPORT_V2_INSIGHTS = "true";
assert.equal(resolveReportV2InsightsEnabled(), true);

if (prev === undefined) delete process.env.NEXT_PUBLIC_REPORT_V2_INSIGHTS;
else process.env.NEXT_PUBLIC_REPORT_V2_INSIGHTS = prev;

console.log("report-insights-rbac.test.ts OK");
