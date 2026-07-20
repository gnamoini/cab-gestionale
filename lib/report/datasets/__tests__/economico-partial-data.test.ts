import assert from "node:assert/strict";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildEconomicoDataset, economicoDatasetWarnings } from "@/lib/report/datasets/builders/economico";
import {
  ECO_DA_INCASSARE_SOURCE_PENDING,
  ECO_FATTURATO_SOURCE_PENDING,
} from "@/lib/report/datasets/builders/shared";
import { wrapReportPayload } from "@/lib/report/datasets/types";
import { defaultRequestedPeriod } from "@/lib/report/datasets/period";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";

const slices = minimalDatasetSlices({ invoicesAvailable: false });
const ctx = createReportDatasetContext({
  period: defaultRequestedPeriod(),
  compareMode: "none",
  integrity: slices.integrity,
});

const result = buildEconomicoDataset(ctx, slices);
assert.equal(result.data.metricHealth?.eco_fatturato?.status, "partial");
assert.equal(result.data.metricHealth?.eco_da_incassare?.status, "partial");
assert.equal(result.data.invoicesAvailable, false);

const warnings = economicoDatasetWarnings(result.data);
assert.deepEqual(warnings, [ECO_FATTURATO_SOURCE_PENDING, ECO_DA_INCASSARE_SOURCE_PENDING]);

const payload = wrapReportPayload(ctx, result, { dataWarnings: warnings });
assert.equal(payload.metadata.trustStatus, "AMBER");
assert.ok(payload.metadata.dataWarnings?.includes(ECO_FATTURATO_SOURCE_PENDING));
assert.ok(payload.metadata.dataWarnings?.includes(ECO_DA_INCASSARE_SOURCE_PENDING));

console.log("economico-partial-data.test.ts OK");
