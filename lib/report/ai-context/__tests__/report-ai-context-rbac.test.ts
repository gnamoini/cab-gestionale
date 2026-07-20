import assert from "node:assert/strict";
import { resolveReportV2AiContextEnabled } from "@/lib/feature-flags/report-v2-flag";

const prev = process.env.NEXT_PUBLIC_REPORT_V2_AI_CONTEXT;
process.env.NEXT_PUBLIC_REPORT_V2_AI_CONTEXT = "false";
assert.equal(resolveReportV2AiContextEnabled(), false);

process.env.NEXT_PUBLIC_REPORT_V2_AI_CONTEXT = "true";
assert.equal(resolveReportV2AiContextEnabled(), true);

if (prev === undefined) delete process.env.NEXT_PUBLIC_REPORT_V2_AI_CONTEXT;
else process.env.NEXT_PUBLIC_REPORT_V2_AI_CONTEXT = prev;

console.log("report-ai-context-rbac.test.ts OK");
