import assert from "node:assert/strict";
import { countAnnullateInRange, buildWarehouseAnalytics } from "@/lib/report/report-domain-analytics";
import { buildDdtKpi } from "@/lib/ddt/ddt-calculations";
import { isoInRange } from "@/lib/report/date-ranges";
import { minimalDatasetSlices } from "@/lib/report/datasets/__tests__/test-helpers";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import {
  computeEcoDdt,
  computeLavCancelled,
  computeMagMovementValue,
  computeMagOrders,
} from "@/lib/report/analytics-engine/calculators";
import { ENGINE_METRIC_MANIFEST } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { BI_SECTION_DATA_MAP } from "@/lib/report/bi-center/section-data-map";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { resolvePresetRange } from "@/lib/report/date-ranges";

const range = resolvePresetRange(new Date("2026-06-15"), "custom", "2026-06-01", "2026-06-30");
const slices = minimalDatasetSlices({ range, compareRange: null, compareMode: "none" });

const bundle: ReportAnalyticsSourceBundle = {
  period: { preset: "custom", start: "2026-06-01", end: "2026-06-30", compareMode: "none" },
  range,
  compareRange: null,
  compareMode: "none",
  rangeKey: slices.rangeKey,
  requirements: { metricIds: [], preventivi: false, invoices: false, invoicePayments: false, ddt: true, timesheet: false, schede: false, ordini: true },
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
  ddtAvailable: true,
  ordiniAvailable: true,
  loadedSlices: new Set(),
};

const ctx = { bundle, range };

// Registry ↔ engine parity for approved map entries
for (const row of BI_SECTION_DATA_MAP) {
  const reg = getRegistryEntry(row.metricId);
  assert.ok(reg, `inventory metric ${row.metricId} in registry`);
  if (row.priority === "P0" || row.priority === "P1" || row.priority === "P2") {
    assert.ok(
      ENGINE_METRIC_MANIFEST[row.metricId],
      `approved ${row.metricId} in engine manifest`,
    );
  }
}

assert.equal(ENGINE_METRIC_MANIFEST.quote_conversion_pct, undefined);

// lav_cancelled ↔ domain analytics
const legacyCancelled = countAnnullateInRange(bundle.lavRows, range);
assert.equal(computeLavCancelled(ctx).value, legacyCancelled);

// mag_movement_value ↔ warehouse analytics
const wh = buildWarehouseAnalytics({
  range,
  rangeKey: slices.rangeKey,
  requestId: 1,
  magLog: slices.integrity.magLog,
  magazzino: slices.integrity.magazzino,
  magazzinoRows: [...slices.magazzinoRows],
  ordini: [],
});
assert.equal(computeMagMovementValue(ctx).value, wh.movementValue);

// eco_ddt empty set
const ddtInRange = bundle.ddtDocuments.filter((d) => isoInRange(d.data_documento, range));
assert.equal(computeEcoDdt(ctx).value, buildDdtKpi(ddtInRange).totale);

assert.equal(computeMagOrders(ctx).value, 0);

console.log("data-integration-parity.test.ts OK");
