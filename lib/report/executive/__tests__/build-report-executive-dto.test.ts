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
import {
  EXECUTIVE_CARD_CONTRACT_VERSION,
  EXECUTIVE_CONTRACT_VERSION,
} from "@/lib/report/executive/types";
import { assertValidDrillDownRef } from "@/lib/report/contracts/drill-down-contract";

const slices = minimalDatasetSlices({ invoicesAvailable: false });
const period = defaultRequestedPeriod();
const ctx = createReportDatasetContext({
  period,
  compareMode: "none",
  integrity: slices.integrity,
});

const lavorazioni = buildLavorazioniDataset(ctx, slices).data;
const magazzino = buildMagazzinoDataset(ctx, slices).data;
const economico = buildEconomicoDataset(ctx, slices).data;
const warnings = economicoDatasetWarnings(economico);

const dto = buildReportExecutiveDto({
  lavorazioni,
  magazzino,
  economico,
  childMetadata: [
    buildReportMetadataEnvelope(ctx),
    buildReportMetadataEnvelope(ctx),
    buildReportMetadataEnvelope(ctx, warnings),
  ],
  requestedPeriod: period,
});

assert.equal(dto.contractVersion, EXECUTIVE_CONTRACT_VERSION);
assert.equal(dto.cards.length, 6);
const expectedOrder = sortedExecutiveMetrics().map((d) => d.metricId);
assert.deepEqual(
  dto.cards.map((c) => c.metricId),
  expectedOrder,
);

const ecoCard = dto.cards.find((c) => c.metricId === "eco_fatturato");
assert.ok(ecoCard);
assert.equal(ecoCard.trust, "AMBER");
assert.notEqual(ecoCard.trust, "GREEN");

const ecoDaCard = dto.cards.find((c) => c.metricId === "eco_da_incassare");
assert.ok(ecoDaCard);
assert.equal(ecoDaCard.trust, "AMBER");

for (const card of dto.cards) {
  assert.equal(card.contractVersion, EXECUTIVE_CARD_CONTRACT_VERSION);
  assert.doesNotThrow(() => assertValidDrillDownRef(card.drillDown));
}

assert.equal(dto.metadata.trustStatus, "AMBER");

console.log("build-report-executive-dto.test.ts OK");
