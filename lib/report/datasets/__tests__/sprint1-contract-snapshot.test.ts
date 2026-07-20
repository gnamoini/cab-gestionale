import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildLavorazioniDataset } from "@/lib/report/datasets/builders/lavorazioni";
import { buildMagazzinoDataset } from "@/lib/report/datasets/builders/magazzino";
import { buildEconomicoDataset, economicoDatasetWarnings } from "@/lib/report/datasets/builders/economico";
import { buildClientiDataset } from "@/lib/report/datasets/builders/clienti";
import { wrapReportPayload } from "@/lib/report/datasets/types";
import { defaultRequestedPeriod } from "@/lib/report/datasets/period";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";

const SNAPSHOT_PATH = path.join(process.cwd(), "test-results/report-v2-sprint1-contract-snapshot.json");
const FIXED_AT = "2026-07-01T12:00:00.000Z";

function normalizePayload(payload: ReportPayload<unknown>): ReportPayload<unknown> {
  return {
    ...payload,
    metadata: {
      ...payload.metadata,
      generatedAt: "<dynamic>",
      calculationDurationMs: "<dynamic>" as unknown as number,
    },
  };
}

const period = defaultRequestedPeriod();
const slices = minimalDatasetSlices();
const ctx = createReportDatasetContext({
  period,
  compareMode: "none",
  integrity: slices.integrity,
  builtAt: FIXED_AT,
});

const economicoResult = buildEconomicoDataset(ctx, { ...slices, invoicesAvailable: false });
const economicoWarnings = economicoDatasetWarnings(economicoResult.data);

const snapshot = {
  lavorazioni: normalizePayload(wrapReportPayload(ctx, buildLavorazioniDataset(ctx, slices))),
  magazzino: normalizePayload(wrapReportPayload(ctx, buildMagazzinoDataset(ctx, slices))),
  economico: normalizePayload(
    wrapReportPayload(ctx, economicoResult, { dataWarnings: economicoWarnings }),
  ),
  clienti: normalizePayload(wrapReportPayload(ctx, buildClientiDataset(ctx, slices))),
};

const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

if (!fs.existsSync(path.dirname(SNAPSHOT_PATH))) {
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
}

if (!fs.existsSync(SNAPSHOT_PATH)) {
  fs.writeFileSync(SNAPSHOT_PATH, serialized, "utf8");
  console.log("sprint1-contract-snapshot.test.ts wrote initial snapshot");
} else {
  const expected = fs.readFileSync(SNAPSHOT_PATH, "utf8");
  assert.equal(serialized, expected, "contract snapshot mismatch — review test-results/report-v2-sprint1-contract-snapshot.json");
}

for (const [name, payload] of Object.entries(snapshot)) {
  assert.equal(payload.metadata.contractVersion, "2.0", `${name} contractVersion`);
  assert.ok(payload.metadata.trustStatus, `${name} trustStatus`);
  assert.notEqual(payload.data, undefined, `${name} data`);
}

console.log("sprint1-contract-snapshot.test.ts OK");
