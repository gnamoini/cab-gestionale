import assert from "node:assert/strict";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildAnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { defaultRequestedPeriod } from "@/lib/report/datasets/period";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";

const slices = minimalDatasetSlices();
const period = defaultRequestedPeriod();
const ctx = createReportDatasetContext({
  period,
  compareMode: "none",
  integrity: slices.integrity,
});

const bundle = buildAnalyticsDatasetBundle({
  lavorazioniCtx: ctx,
  magazzinoCtx: ctx,
  economicoCtx: ctx,
  oreCtx: ctx,
  baseSlices: slices,
  economicoSlices: slices,
  oreSlices: slices,
});

assert.ok(bundle.datasets.lavorazioni);
assert.ok(bundle.datasets.magazzino);
assert.ok(bundle.datasets.economico);
assert.ok(bundle.datasets.ore);
assert.ok(Array.isArray(bundle.metadata.childMetadata));
assert.equal(bundle.metadata.childMetadata.length, 4);
assert.ok(bundle.metadata.generatedAt);

console.log("analytics-dataset-bundle.test.ts OK");
