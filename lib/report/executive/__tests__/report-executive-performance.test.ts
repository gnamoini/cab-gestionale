import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildLavorazioniDataset } from "@/lib/report/datasets/builders/lavorazioni";
import { buildMagazzinoDataset } from "@/lib/report/datasets/builders/magazzino";
import { buildEconomicoDataset } from "@/lib/report/datasets/builders/economico";
import { defaultRequestedPeriod } from "@/lib/report/datasets/period";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";
import { buildReportExecutiveDto } from "@/lib/report/executive/build-report-executive-dto";
import { EXECUTIVE_METRIC_REGISTRY } from "@/lib/report/executive/executive-metric-registry";
import { EXECUTIVE_CONTRACT_VERSION } from "@/lib/report/executive/types";

const slices = minimalDatasetSlices({ invoicesAvailable: true, invoices: [] });
const period = defaultRequestedPeriod();
const ctx = createReportDatasetContext({
  period,
  compareMode: "none",
  integrity: slices.integrity,
});

const input = {
  lavorazioni: buildLavorazioniDataset(ctx, slices).data,
  magazzino: buildMagazzinoDataset(ctx, slices).data,
  economico: buildEconomicoDataset(ctx, slices).data,
};

const durations: number[] = [];
for (let i = 0; i < 50; i++) {
  const t0 = performance.now();
  buildReportExecutiveDto(input);
  durations.push(performance.now() - t0);
}
durations.sort((a, b) => a - b);
const p95 = durations[Math.floor(durations.length * 0.95)] ?? durations[durations.length - 1]!;
// ponytail: generous CI ceiling; tighten when runner is stable
assert.ok(p95 < 50, `buildReportExecutiveDto p95 ${p95.toFixed(2)}ms >= 50ms`);

const dto = buildReportExecutiveDto(input);
const payload = {
  metadata: dto.metadata,
  data: { contractVersion: EXECUTIVE_CONTRACT_VERSION, cards: dto.cards },
};
const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
assert.ok(payloadBytes < 8 * 1024, `payload size ${payloadBytes} >= 8KB`);

assert.equal(dto.cards.length, EXECUTIVE_METRIC_REGISTRY.length);
assert.equal(new Set(dto.cards.map((c) => c.metricId)).size, dto.cards.length);
for (const def of EXECUTIVE_METRIC_REGISTRY) {
  assert.ok(dto.cards.some((c) => c.metricId === def.metricId), `missing card ${def.metricId}`);
}

console.log("report-executive-performance.test.ts OK");
