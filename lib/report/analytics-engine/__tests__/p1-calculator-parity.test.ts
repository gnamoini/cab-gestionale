import assert from "node:assert/strict";
import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildLavorazioniDataset } from "@/lib/report/datasets/builders/lavorazioni";
import { buildMagazzinoDataset } from "@/lib/report/datasets/builders/magazzino";
import { buildEconomicoDataset } from "@/lib/report/datasets/builders/economico";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";
import { FIXTURE_PERIOD } from "@/lib/report/__tests__/fixtures/lavorazioni-period.fixture";
import { magazzinoScortaFixture } from "@/lib/report/__tests__/fixtures/magazzino-scorta.fixture";
import { computeEcoFatturato, computeLavChiusi, computeScorta } from "@/lib/report/analytics-engine/calculators";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import { envelopesToExecutiveSlices } from "@/lib/report/analytics-engine/adapters/to-executive-slices";
import { buildReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { sottoScortaCount } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { resolvePresetRange } from "@/lib/report/date-ranges";

const range = resolvePresetRange(new Date("2026-06-15"), "custom", FIXTURE_PERIOD.start, FIXTURE_PERIOD.end);
const slices = minimalDatasetSlices({ range, compareRange: null, compareMode: "none" });

const bundle: ReportAnalyticsSourceBundle = {
  period: { preset: "custom", start: FIXTURE_PERIOD.start, end: FIXTURE_PERIOD.end, compareMode: "none" },
  range,
  compareRange: null,
  compareMode: "none",
  rangeKey: slices.rangeKey,
  requirements: { metricIds: [], preventivi: false, invoices: false, invoicePayments: false, ddt: false, timesheet: false, schede: false, ordini: false },
  integrity: slices.integrity,
  lavRows: slices.lavRows,
  magazzinoRows: slices.magazzinoRows,
  preventivi: [],
  invoices: [],
  invoicePayments: [],
  ddtDocuments: [],
  ordini: [],
  totalHours: 0,
  timesheetEntries: [],
  timesheetEmployees: [],
  schedeStore: null,
  costoOrario: 48,
  invoicesAvailable: false,
  ddtAvailable: false,
  ordiniAvailable: false,
  loadedSlices: new Set(),
};

const ctx = createReportDatasetContext({ period: bundle.period, compareMode: "none", integrity: slices.integrity });
const lavLegacy = buildLavorazioniDataset(ctx, slices);
const magLegacy = buildMagazzinoDataset(ctx, slices);
const ecoLegacy = buildEconomicoDataset(ctx, { ...slices, invoicesAvailable: false });

function legacyValue(rows: { id: string; value: number }[], id: string): number {
  return rows.find((m) => m.id === id)?.value ?? NaN;
}

assert.equal(computeLavChiusi({ bundle, range }).value, legacyValue(lavLegacy.data.metrics, "lav-chiusi"));
assert.equal(computeScorta({ bundle, range }).value, legacyValue(magLegacy.data.metrics, "scorta"));
assert.equal(computeScorta({ bundle, range }).value, sottoScortaCount(slices.integrity.magazzino));
assert.equal(computeEcoFatturato({ bundle, range }).value, legacyValue(ecoLegacy.data.metrics, "eco_fatturato"));

const env = buildReportMetricEnvelope(
  { id: "lav-chiusi", value: 0, compare: null, source: { module: "test" } },
  getRegistryEntry("lav-chiusi")!,
  range,
);
const execSlice = envelopesToExecutiveSlices([env])[0]!;
assert.equal(execSlice.metricId, "lav-chiusi");
assert.equal(execSlice.sourceDataset, "lavorazioni");

void magazzinoScortaFixture;

console.log("p1-calculator-parity.test.ts OK");
