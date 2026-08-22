import assert from "node:assert/strict";
import { resolveBusinessReportEnabled } from "@/lib/feature-flags/report-v2-flag";

const prev = process.env.NEXT_PUBLIC_BUSINESS_REPORT_ENABLED;
process.env.NEXT_PUBLIC_BUSINESS_REPORT_ENABLED = "false";
assert.equal(resolveBusinessReportEnabled(), false);
process.env.NEXT_PUBLIC_BUSINESS_REPORT_ENABLED = "true";
assert.equal(resolveBusinessReportEnabled(), true);
if (prev === undefined) delete process.env.NEXT_PUBLIC_BUSINESS_REPORT_ENABLED;
else process.env.NEXT_PUBLIC_BUSINESS_REPORT_ENABLED = prev;

console.log("feature-flag-business-report.test.ts OK");
