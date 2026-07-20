import assert from "node:assert/strict";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildLavorazioniDataset } from "@/lib/report/datasets/builders/lavorazioni";
import { buildMagazzinoDataset } from "@/lib/report/datasets/builders/magazzino";
import { buildEconomicoDataset } from "@/lib/report/datasets/builders/economico";
import { defaultRequestedPeriod } from "@/lib/report/datasets/period";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

const EXECUTIVE_METRICS = [
  { metricId: "lav-chiusi", dataset: "lavorazioni" as const },
  { metricId: "lav-aperti", dataset: "lavorazioni" as const },
  { metricId: "lav_late_sla", dataset: "lavorazioni" as const },
  { metricId: "scorta", dataset: "magazzino" as const },
  { metricId: "eco_fatturato", dataset: "economico" as const },
  { metricId: "eco_da_incassare", dataset: "economico" as const },
];

const slices = minimalDatasetSlices({ invoicesAvailable: false });
const ctx = createReportDatasetContext({
  period: defaultRequestedPeriod(),
  compareMode: "none",
  integrity: slices.integrity,
});

const lavorazioni = buildLavorazioniDataset(ctx, slices).data;
const magazzino = buildMagazzinoDataset(ctx, slices).data;
const economico = buildEconomicoDataset(ctx, slices).data;

const datasetMetrics = {
  lavorazioni: new Set(lavorazioni.metrics.map((m) => m.id)),
  magazzino: new Set(magazzino.metrics.map((m) => m.id)),
  economico: new Set(economico.metrics.map((m) => m.id)),
};

for (const { metricId, dataset } of EXECUTIVE_METRICS) {
  assert.ok(getRegistryEntry(metricId), `registry entry for ${metricId}`);
  assert.ok(datasetMetrics[dataset].has(metricId), `${metricId} in ${dataset} dataset`);
}

assert.equal(economico.metricHealth?.eco_fatturato?.status, "partial");
assert.equal(economico.metricHealth?.eco_da_incassare?.status, "partial");

console.log("executive-metric-readiness.test.ts OK");
