import assert from "node:assert/strict";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import { buildReportCrossDto, buildReportCrossDtoFromDerived } from "@/lib/report/cross-analysis/build-report-cross-dto";
import { buildCrossAnalytics } from "@/lib/report/report-domain-analytics";
import { bundleFromDomainDtos } from "@/lib/report/cross-analysis/normalize-cross-input";
import { CROSS_NUMERIC_PRECISION } from "@/lib/report/cross-analysis/types";
import { CROSS_P0_METRIC_IDS } from "@/lib/report/cross-analysis/cross-metric-registry";
import {
  buildReportRangeKey,
  type DerivedEntry,
  type EconomicAnalyticsDto,
  type LaborAnalyticsDto,
  type OperationalAnalyticsDto,
  type ReportAnalyticsDerivedSnapshot,
  type WarehouseAnalyticsDto,
} from "@/lib/report/report-domain-types";

function assertClose(actual: number, expected: number, precision = CROSS_NUMERIC_PRECISION): void {
  const factor = 10 ** precision;
  const a = Math.round(actual * factor);
  const b = Math.round(expected * factor);
  assert.equal(a, b, `expected ${expected} got ${actual} (precision ${precision})`);
}

const range = {
  start: startOfLocalDay(new Date("2025-03-01T00:00:00.000Z")),
  end: endOfLocalDay(new Date("2025-03-31T23:59:59.999Z")),
};
const rangeKey = buildReportRangeKey(range, null);

const entry = <T,>(data: T): DerivedEntry<T> => ({
  data,
  rangeKey,
  generatedAt: Date.now(),
  version: 2,
});

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

const whDto: WarehouseAnalyticsDto = {
  metrics: [],
  partsUsedQty: 20,
  movementValue: 500,
  criticalStockCount: 1,
  ordersCount: 2,
};

const labDto: LaborAnalyticsDto = {
  metrics: [],
  totalHours: 40,
  actualLaborHours: 32,
  completedJobs: 10,
  avgHoursPerJob: 4,
  actualHoursPerJob: 3.2,
  manodoperaCost: 800,
};

const ecoDto: EconomicAnalyticsDto = {
  metrics: [],
  preventiviCount: 3,
  preventiviValue: 1000,
  invoicesBilled: 2000,
  ddtCount: 5,
};

const fullDerived: ReportAnalyticsDerivedSnapshot = {
  revision: 3,
  currentRangeKey: rangeKey,
  operational: entry(opDto),
  warehouse: entry(whDto),
  labor: entry(labDto),
  economic: entry(ecoDto),
};

const legacy = buildCrossAnalytics(fullDerived);
const bundle = bundleFromDomainDtos({
  operational: opDto,
  warehouse: whDto,
  labor: labDto,
  economic: ecoDto,
  invoicesAvailable: true,
});
const dto = buildReportCrossDto(bundle);

const expectedValues: Record<string, number> = {
  cross_efficiency: 0.25,
  cross_parts_job: 2,
  cross_cost_job: 130,
  cross_value_hour: 50,
};

for (const metricId of CROSS_P0_METRIC_IDS) {
  const legacyMetric = legacy.metrics.find((m) => m.id === metricId);
  const newMetric = dto.metrics.find((m) => m.metricId === metricId);
  assert.ok(legacyMetric, `legacy ${metricId}`);
  assert.ok(newMetric, `new ${metricId}`);
  assert.equal(legacyMetric!.state.status, "available");
  assertClose(newMetric!.value, expectedValues[metricId]!);
}

const emptyDerived: ReportAnalyticsDerivedSnapshot = { revision: 0, currentRangeKey: rangeKey };
const emptyLegacy = buildCrossAnalytics(emptyDerived);
const emptyDto = buildReportCrossDtoFromDerived(emptyDerived);

for (const metricId of CROSS_P0_METRIC_IDS) {
  const legacyMetric = emptyLegacy.metrics.find((m) => m.id === metricId);
  assert.equal(legacyMetric?.state.status, "not_loaded");
  const newMetric = emptyDto.metrics.find((m) => m.metricId === metricId);
  assert.equal(newMetric?.trust, "AMBER");
}

console.log("cross-parity.test.ts OK");
