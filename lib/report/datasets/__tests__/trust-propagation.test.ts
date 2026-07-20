import assert from "node:assert/strict";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildReportMetadataEnvelope } from "@/lib/report/datasets/metadata/build-report-metadata-envelope";
import { defaultRequestedPeriod } from "@/lib/report/datasets/period";
import { emptyIntegrityResult } from "@/lib/report/datasets/__tests__/test-helpers";

const integrity = emptyIntegrityResult();
integrity.audit.findings.push({
  code: "query_error",
  severity: "warning",
  message: "Query lavorazioni in errore",
});

const ctx = createReportDatasetContext({
  period: defaultRequestedPeriod(),
  compareMode: "none",
  integrity,
});

const meta = buildReportMetadataEnvelope(ctx);
assert.equal(meta.trustStatus, "AMBER");
assert.ok(meta.dataWarnings?.some((w) => w.includes("lavorazioni")));

console.log("trust-propagation.test.ts OK");
