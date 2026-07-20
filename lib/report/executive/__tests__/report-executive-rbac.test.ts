import assert from "node:assert/strict";
import { resolveReportV2ExecutiveEnabled } from "@/lib/feature-flags/report-v2-flag";

const prev = process.env.NEXT_PUBLIC_REPORT_V2_EXECUTIVE;
process.env.NEXT_PUBLIC_REPORT_V2_EXECUTIVE = "false";
assert.equal(resolveReportV2ExecutiveEnabled(), false);

process.env.NEXT_PUBLIC_REPORT_V2_EXECUTIVE = "true";
assert.equal(resolveReportV2ExecutiveEnabled(), true);

if (prev === undefined) delete process.env.NEXT_PUBLIC_REPORT_V2_EXECUTIVE;
else process.env.NEXT_PUBLIC_REPORT_V2_EXECUTIVE = prev;

console.log("report-executive-rbac.test.ts OK");
