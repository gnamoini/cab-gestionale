import assert from "node:assert/strict";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import {
  buildCrossAnalytics,
  buildInvoicePeriodKpi,
  buildOperationalAnalytics,
  countAnnullateInRange,
} from "@/lib/report/report-domain-analytics";
import {
  buildReportRangeKey,
  isDerivedEntryFresh,
  type DerivedEntry,
  type OperationalAnalyticsDto,
  type ReportAnalyticsDerivedSnapshot,
} from "@/lib/report/report-domain-types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { InvoiceRow } from "@/src/types/supabase-tables";

const range = {
  start: startOfLocalDay(new Date("2025-03-01T00:00:00.000Z")),
  end: endOfLocalDay(new Date("2025-03-31T23:59:59.999Z")),
};
const rangeKey = buildReportRangeKey(range, null);

assert.equal(
  buildOperationalAnalytics({
    rangeKey,
    requestId: 1,
    range,
    attive: [],
    storico: [],
    completate: [],
    lavRows: [],
  }).completedInPeriod,
  0,
);

const emptyDerived: ReportAnalyticsDerivedSnapshot = { revision: 0, currentRangeKey: rangeKey };
const crossEmpty = buildCrossAnalytics(emptyDerived);
assert.equal(crossEmpty.metrics.length, 4);
for (const m of crossEmpty.metrics) {
  assert.equal(m.state.status, "not_loaded");
}

const opDto: OperationalAnalyticsDto = {
  metrics: [],
  openedInPeriod: 5,
  completedInPeriod: 10,
  archivedTotal: 2,
  cancelledInPeriod: 1,
  backlog: 3,
  avgCloseDays: 4,
  lateCount: 0,
  clientsServed: 6,
};

const entry = <T,>(data: T): DerivedEntry<T> => ({
  data,
  rangeKey,
  generatedAt: Date.now(),
  version: 2,
});

const fullDerived: ReportAnalyticsDerivedSnapshot = {
  revision: 3,
  currentRangeKey: rangeKey,
  operational: entry(opDto),
  warehouse: entry({
    metrics: [],
    partsUsedQty: 20,
    movementValue: 500,
    criticalStockCount: 1,
    ordersCount: 2,
  }),
  labor: entry({
    metrics: [],
    totalHours: 40,
    actualLaborHours: 32,
    completedJobs: 10,
    avgHoursPerJob: 4,
    actualHoursPerJob: 3.2,
    manodoperaCost: 800,
  }),
  economic: entry({
    metrics: [],
    preventiviCount: 3,
    preventiviValue: 1000,
    invoicesBilled: 2000,
    ddtCount: 5,
  }),
};

const crossFull = buildCrossAnalytics(fullDerived);
const byId = Object.fromEntries(crossFull.metrics.map((m) => [m.id, m.state.status]));
assert.equal(byId.cross_efficiency, "available");
assert.equal(byId.cross_parts_job, "available");
assert.equal(byId.cross_cost_job, "available");
assert.equal(byId.cross_value_hour, "available");

assert.ok(isDerivedEntryFresh(fullDerived.operational, { rangeKey, version: 2 }));
assert.equal(isDerivedEntryFresh(fullDerived.operational, { rangeKey, version: 1 }), false);
assert.equal(isDerivedEntryFresh(undefined, { rangeKey, version: 0 }), false);

const annullata = {
  id: "x",
  stato: "annullata",
  data_ingresso: "2025-03-10T00:00:00.000Z",
} as LavorazioneListRow;
assert.equal(countAnnullateInRange([annullata], range), 1);

const invoice = {
  status: "emessa",
  data_emissione: "2025-03-15",
  totale: 100,
  residuo: 50,
  data_scadenza: "2025-01-01",
} as InvoiceRow;
const invKpi = buildInvoicePeriodKpi([invoice], range);
assert.equal(invKpi.emesse, 1);
assert.equal(invKpi.fatturato, 100);
assert.equal(invKpi.daIncassare, 50);
assert.equal(invKpi.scadute, 1);

console.log("report-domain-analytics.test.ts OK");
