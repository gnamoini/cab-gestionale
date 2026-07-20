import assert from "node:assert/strict";
import { resolveReportV2DomainDtoEnabled } from "@/lib/feature-flags/report-v2-flag";

const prev = process.env.NEXT_PUBLIC_REPORT_V2_DOMAIN_DTO;
process.env.NEXT_PUBLIC_REPORT_V2_DOMAIN_DTO = "false";
assert.equal(resolveReportV2DomainDtoEnabled(), false);

process.env.NEXT_PUBLIC_REPORT_V2_DOMAIN_DTO = "true";
assert.equal(resolveReportV2DomainDtoEnabled(), true);

if (prev === undefined) delete process.env.NEXT_PUBLIC_REPORT_V2_DOMAIN_DTO;
else process.env.NEXT_PUBLIC_REPORT_V2_DOMAIN_DTO = prev;

console.log("report-cross-rbac.test.ts OK");
