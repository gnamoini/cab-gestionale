import assert from "node:assert/strict";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildLavorazioniDataset } from "@/lib/report/datasets/builders/lavorazioni";
import { buildMagazzinoDataset } from "@/lib/report/datasets/builders/magazzino";
import { buildEconomicoDataset, economicoDatasetWarnings } from "@/lib/report/datasets/builders/economico";
import { buildReportMetadataEnvelope } from "@/lib/report/datasets/metadata/build-report-metadata-envelope";
import { defaultRequestedPeriod } from "@/lib/report/datasets/period";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";
import { buildReportExecutiveDto } from "@/lib/report/executive/build-report-executive-dto";
import { sortedExecutiveMetrics } from "@/lib/report/executive/executive-metric-registry";

const slices = minimalDatasetSlices({ invoicesAvailable: true, invoices: [] });
const period = defaultRequestedPeriod();
const ctx = createReportDatasetContext({
  period,
  compareMode: "none",
  integrity: slices.integrity,
});

const dto = buildReportExecutiveDto({
  lavorazioni: buildLavorazioniDataset(ctx, slices).data,
  magazzino: buildMagazzinoDataset(ctx, slices).data,
  economico: buildEconomicoDataset(ctx, slices).data,
  childMetadata: [buildReportMetadataEnvelope(ctx)],
  requestedPeriod: period,
});

assert.equal(dto.cards.length, sortedExecutiveMetrics().length);
for (const def of sortedExecutiveMetrics()) {
  const card = dto.cards.find((c) => c.metricId === def.metricId);
  assert.ok(card, `card ${def.metricId}`);
  assert.equal(card.displayKey, def.displayKey);
  assert.equal(card.drillDown.targetSection, def.drillDown.targetSection);
  assert.equal(card.drillDown.targetTab, def.drillDown.targetTab);
}

console.log("executive-card-parity.test.ts OK");
