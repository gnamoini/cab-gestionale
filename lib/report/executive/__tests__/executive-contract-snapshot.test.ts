import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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
  type ReportExecutiveDto,
} from "@/lib/report/executive/types";

const SNAPSHOT_PATH = path.join(process.cwd(), "test-results/report-v2-executive-contract-snapshot.json");

function buildContractSnapshot(dto: ReportExecutiveDto) {
  const defsById = new Map(sortedExecutiveMetrics().map((d) => [d.metricId, d]));
  return {
    contractVersion: dto.contractVersion,
    cards: dto.cards.map((card) => {
      const def = defsById.get(card.metricId);
      assert.ok(def, `registry def for ${card.metricId}`);
      return {
        contractVersion: card.contractVersion,
        metricId: card.metricId,
        dataset: def.dataset,
        priority: def.priority,
        displayKey: card.displayKey,
        label: card.label,
        trust: card.trust,
        drillDown: card.drillDown,
        warnings: card.warnings ?? null,
      };
    }),
    metadata: {
      contractVersion: dto.metadata.contractVersion,
      trustStatus: dto.metadata.trustStatus,
      sourceFreshness: dto.metadata.sourceFreshness,
      generatedAt: "<dynamic>",
      dataWarnings: dto.metadata.dataWarnings
        ? [...dto.metadata.dataWarnings].sort()
        : undefined,
    },
  };
}

const slices = minimalDatasetSlices({ invoicesAvailable: false });
const period = defaultRequestedPeriod();
const ctx = createReportDatasetContext({
  period,
  compareMode: "none",
  integrity: slices.integrity,
});

const warnings = economicoDatasetWarnings(buildEconomicoDataset(ctx, slices).data);
const dto = buildReportExecutiveDto({
  lavorazioni: buildLavorazioniDataset(ctx, slices).data,
  magazzino: buildMagazzinoDataset(ctx, slices).data,
  economico: buildEconomicoDataset(ctx, slices).data,
  childMetadata: [
    buildReportMetadataEnvelope(ctx),
    buildReportMetadataEnvelope(ctx),
    buildReportMetadataEnvelope(ctx, warnings),
  ],
  requestedPeriod: period,
});

assert.equal(dto.contractVersion, EXECUTIVE_CONTRACT_VERSION);
for (const card of dto.cards) {
  assert.equal(card.contractVersion, EXECUTIVE_CARD_CONTRACT_VERSION);
}

const snapshot = buildContractSnapshot(dto);
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

if (!fs.existsSync(path.dirname(SNAPSHOT_PATH))) {
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
}

if (!fs.existsSync(SNAPSHOT_PATH)) {
  fs.writeFileSync(SNAPSHOT_PATH, serialized, "utf8");
  console.log("executive-contract-snapshot.test.ts wrote initial snapshot");
} else {
  const expected = fs.readFileSync(SNAPSHOT_PATH, "utf8");
  assert.equal(serialized, expected, "executive contract snapshot mismatch");
}

console.log("executive-contract-snapshot.test.ts OK");
