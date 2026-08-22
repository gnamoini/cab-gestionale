import assert from "node:assert/strict";
import {
  buildIdempotencyKey,
  buildLogicalReportKey,
  buildNextGenerationVersion,
} from "@/lib/report/business-report/idempotency/report-run-keys";

const base = {
  reportType: "weekly" as const,
  periodStart: "2026-08-11",
  periodEnd: "2026-08-17",
  compareMode: "prev_period" as const,
};

const logical = buildLogicalReportKey(base);
assert.match(logical, /^weekly:2026-08-11:2026-08-17:prev_period:1:1$/);

const idemV1 = buildIdempotencyKey({ ...base, generationVersion: 1 });
const idemV2 = buildIdempotencyKey({ ...base, generationVersion: 2 });
assert.notEqual(idemV1, idemV2);
assert.ok(idemV1.startsWith(logical));

assert.equal(buildNextGenerationVersion(1), 2);
assert.equal(buildNextGenerationVersion(null), 1);

console.log("report-run-keys.test.ts OK");
