import assert from "node:assert/strict";
import { enumerateBucketDates } from "@/lib/report/kpi-series/bucket";
import { buildMetricSeriesForEngine } from "@/lib/report/analytics-engine/series/build-metric-series";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import { resolvePresetRange } from "@/lib/report/date-ranges";

const range = resolvePresetRange(new Date("2026-06-15"), "current_month");
const slices = minimalDatasetSlices({ range });
const bundle: ReportAnalyticsSourceBundle = {
  period: { preset: "custom", start: "2026-06-01", end: "2026-06-30", compareMode: "none" },
  range,
  compareRange: null,
  compareMode: "none",
  rangeKey: slices.rangeKey,
  requirements: {
    metricIds: ["lav-chiusi"],
    preventivi: false,
    invoices: false,
    invoicePayments: false,
    ddt: false,
    timesheet: false,
    schede: false,
    ordini: false,
  },
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

const series = buildMetricSeriesForEngine({
  metricId: "lav-chiusi",
  calculatorId: "computeLavChiusi",
  bundle,
  granularity: "week",
});

assert.equal(series.points.length, enumerateBucketDates(range, "week").length);
assert.ok(series.points.every((p) => p.trust === "verified"));

const legacySlices = {
  ...slices,
  integrity: {
    ...slices.integrity,
    completate: [
      {
        id: "legacy-aug",
        macchina: "M",
        targa: "—",
        matricola: "—",
        nScuderia: "",
        cliente: "C",
        utilizzatore: "—",
        cantiere: "",
        addetto: "—",
        note: "",
        statoFinaleId: "completata",
        prioritaFinale: "media" as const,
        dataIngresso: "2026-07-01T10:00:00.000Z",
        dataCompletamento: "",
        meseCompletamento: "2026-08",
      },
    ],
  },
};
const augRange = {
  start: new Date(2026, 7, 1, 0, 0, 0, 0),
  end: new Date(2026, 7, 31, 23, 59, 59, 999),
};
const legacyBundle: ReportAnalyticsSourceBundle = {
  ...bundle,
  range: augRange,
  integrity: legacySlices.integrity,
};
const monthly = buildMetricSeriesForEngine({
  metricId: "lav-chiusi",
  calculatorId: "computeLavChiusi",
  bundle: legacyBundle,
  granularity: "month",
});
assert.equal(monthly.points[0]?.value, 1, "serie mensile conta meseCompletamento legacy");

console.log("p1-series-engine.test.ts OK");
