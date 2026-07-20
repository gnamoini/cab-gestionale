import assert from "node:assert/strict";
import { REPORT_CONTRACT_VERSION } from "@/lib/report/contracts/contract-version";
import {
  SOURCE_FRESHNESS_VALUES,
  TRUST_STATUSES,
  type ReportMetadataEnvelope,
} from "@/lib/report/contracts/metadata-envelope";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import {
  assertValidReportMetadata,
  assertValidReportPayload,
} from "@/lib/report/contracts/validate-envelope";

const validMetadata: ReportMetadataEnvelope = {
  contractVersion: REPORT_CONTRACT_VERSION,
  generatedAt: "2026-07-01T12:00:00.000Z",
  sourceFreshness: "LIVE",
  trustStatus: "GREEN",
  dataWarnings: [],
  calculationDurationMs: 12,
};

const validPayload: ReportPayload<{ count: number }> = {
  metadata: validMetadata,
  data: { count: 42 },
};

assert.doesNotThrow(() => assertValidReportMetadata(validMetadata));
assert.doesNotThrow(() => assertValidReportPayload(validPayload));

const roundTrip = JSON.parse(JSON.stringify(validPayload)) as ReportPayload<{ count: number }>;
assert.doesNotThrow(() => assertValidReportPayload(roundTrip));
assert.equal(roundTrip.metadata.contractVersion, "2.0");
assert.equal(roundTrip.data.count, 42);

assert.throws(() => assertValidReportPayload({ data: { count: 1 } } as ReportPayload<unknown>));
assert.throws(() => assertValidReportPayload({ metadata: validMetadata } as ReportPayload<unknown>));
assert.throws(() =>
  assertValidReportMetadata({ ...validMetadata, contractVersion: "1.0" as "2.0" }),
);
assert.throws(() => assertValidReportMetadata({ ...validMetadata, generatedAt: "not-a-date" }));
assert.throws(() =>
  assertValidReportMetadata({ ...validMetadata, sourceFreshness: "INVALID" as "LIVE" }),
);
assert.throws(() =>
  assertValidReportMetadata({ ...validMetadata, trustStatus: "BLUE" as "GREEN" }),
);

for (const freshness of SOURCE_FRESHNESS_VALUES) {
  assert.doesNotThrow(() =>
    assertValidReportMetadata({ ...validMetadata, sourceFreshness: freshness }),
  );
}

for (const trust of TRUST_STATUSES) {
  assert.doesNotThrow(() => assertValidReportMetadata({ ...validMetadata, trustStatus: trust }));
}

const emptyDataPayload: ReportPayload<Record<string, never>> = {
  metadata: validMetadata,
  data: {},
};
assert.doesNotThrow(() => assertValidReportPayload(emptyDataPayload));

console.log("report-contracts.test.ts OK");
