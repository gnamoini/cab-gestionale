import assert from "node:assert/strict";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildLavorazioniDataset } from "@/lib/report/datasets/builders/lavorazioni";
import { buildMagazzinoDataset } from "@/lib/report/datasets/builders/magazzino";
import { buildEconomicoDataset } from "@/lib/report/datasets/builders/economico";
import { buildOreDataset } from "@/lib/report/datasets/builders/ore";
import { buildClientiDataset } from "@/lib/report/datasets/builders/clienti";
import { assertCanonicalMetricsRegistered } from "@/lib/report/datasets/registry";
import { wrapReportPayload } from "@/lib/report/datasets/types";
import { defaultRequestedPeriod } from "@/lib/report/datasets/period";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";

const period = defaultRequestedPeriod();
const slices = minimalDatasetSlices();
const ctx = createReportDatasetContext({
  period,
  compareMode: "none",
  integrity: slices.integrity,
  builtAt: "2026-07-01T12:00:00.000Z",
});

const builders = [
  ["lavorazioni", buildLavorazioniDataset(ctx, slices)],
  ["magazzino", buildMagazzinoDataset(ctx, slices)],
  ["economico", buildEconomicoDataset(ctx, { ...slices, invoicesAvailable: false })],
  ["ore", buildOreDataset(ctx, slices)],
  ["clienti", buildClientiDataset(ctx, slices)],
] as const;

for (const [name, result] of builders) {
  assert.ok(result.metricIds.length > 0, `${name} metricIds`);
  for (const id of result.metricIds) {
    assert.ok(id.trim().length > 0, `${name} empty id`);
    assert.equal(id, resolveCanonicalMetricId(id), `${name} canonical ${id}`);
    assert.ok(getRegistryEntry(id), `${name} registry ${id}`);
  }
  assert.doesNotThrow(() => assertCanonicalMetricsRegistered(result.metricIds));

  const payload = wrapReportPayload(ctx, result);
  assert.equal(payload.metadata.contractVersion, "2.0");
  assert.ok(payload.metadata.generatedAt);
  assert.ok(payload.metadata.sourceFreshness);
  assert.ok(payload.metadata.trustStatus);
  assert.notEqual(payload.data, undefined);
}

console.log("report-dataset-contract-invariant.test.ts OK");
