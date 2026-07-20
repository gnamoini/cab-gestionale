import assert from "node:assert/strict";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildReportMetadataEnvelope } from "@/lib/report/datasets/metadata/build-report-metadata-envelope";
import { defaultRequestedPeriod } from "@/lib/report/datasets/period";
import { emptyIntegrityResult } from "@/lib/report/datasets/__tests__/test-helpers";
import { ECO_FATTURATO_SOURCE_PENDING } from "@/lib/report/datasets/builders/shared";

const period = defaultRequestedPeriod();

const okCtx = createReportDatasetContext({
  period,
  compareMode: "none",
  integrity: emptyIntegrityResult(),
  builtAt: "2026-07-01T12:00:00.000Z",
});

const metaOk = buildReportMetadataEnvelope(okCtx);
assert.equal(metaOk.trustStatus, "GREEN");
assert.equal(metaOk.sourceFreshness, "LIVE");

const degraded = emptyIntegrityResult();
degraded.status = "degraded";
degraded.audit.findings.push({ code: "cache_drift", severity: "warning", message: "drift" });
const degradedCtx = createReportDatasetContext({
  period,
  compareMode: "none",
  integrity: degraded,
  builtAt: "2026-07-01T12:00:00.000Z",
});
const metaDegraded = buildReportMetadataEnvelope(degradedCtx);
assert.equal(metaDegraded.trustStatus, "AMBER");
assert.equal(metaDegraded.sourceFreshness, "STALE");

const blocked = emptyIntegrityResult();
blocked.status = "blocked";
blocked.audit.strictBlocked = true;
const blockedCtx = createReportDatasetContext({
  period,
  compareMode: "none",
  integrity: blocked,
});
const metaBlocked = buildReportMetadataEnvelope(blockedCtx);
assert.equal(metaBlocked.trustStatus, "RED");

const withWarnings = buildReportMetadataEnvelope(okCtx, [ECO_FATTURATO_SOURCE_PENDING]);
assert.equal(withWarnings.trustStatus, "AMBER");
assert.ok(withWarnings.dataWarnings?.includes(ECO_FATTURATO_SOURCE_PENDING));

console.log("build-report-metadata-envelope.test.ts OK");
