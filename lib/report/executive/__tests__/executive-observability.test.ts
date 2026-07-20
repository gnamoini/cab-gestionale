import assert from "node:assert/strict";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildLavorazioniDataset } from "@/lib/report/datasets/builders/lavorazioni";
import { buildMagazzinoDataset } from "@/lib/report/datasets/builders/magazzino";
import { buildEconomicoDataset, economicoDatasetWarnings } from "@/lib/report/datasets/builders/economico";
import { buildReportMetadataEnvelope } from "@/lib/report/datasets/metadata/build-report-metadata-envelope";
import { defaultRequestedPeriod } from "@/lib/report/datasets/period";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";
import { buildReportExecutiveDto } from "@/lib/report/executive/build-report-executive-dto";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";

const captured: {
  event: string;
  payload: { metricId: string; trust?: string; violationType?: string };
}[] = [];

reportMetricObserver.setSink((event, payload) => {
  captured.push({ event, payload });
});

const slices = minimalDatasetSlices({ invoicesAvailable: false });
const period = defaultRequestedPeriod();
const ctx = createReportDatasetContext({
  period,
  compareMode: "none",
  integrity: slices.integrity,
});

const economico = buildEconomicoDataset(ctx, slices).data;
const warnings = economicoDatasetWarnings(economico);

buildReportExecutiveDto({
  lavorazioni: buildLavorazioniDataset(ctx, slices).data,
  magazzino: buildMagazzinoDataset(ctx, slices).data,
  economico,
  childMetadata: [
    buildReportMetadataEnvelope(ctx),
    buildReportMetadataEnvelope(ctx),
    buildReportMetadataEnvelope(ctx, warnings),
  ],
  requestedPeriod: period,
});

const partialEvents = captured.filter((e) => e.event === "executive_metric_partial");
const partialIds = partialEvents.map((e) => e.payload.metricId).sort();
assert.deepEqual(partialIds, ["eco_da_incassare", "eco_fatturato"]);
assert.equal(new Set(partialIds).size, partialIds.length);

for (const evt of partialEvents) {
  assert.equal(evt.payload.trust, "AMBER");
}

assert.equal(
  captured.filter((e) => e.event === "executive_contract_violation").length,
  0,
);

reportMetricObserver.setSink(null);
reportMetricObserver.drain();

console.log("executive-observability.test.ts OK");
