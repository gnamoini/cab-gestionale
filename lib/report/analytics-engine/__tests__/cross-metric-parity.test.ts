import assert from "node:assert/strict";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import {
  buildReportCrossDto,
  computeCrossCostJob,
  computeCrossEfficiency,
  computeCrossPartsJob,
  computeCrossValueHour,
} from "@/lib/report/cross-analysis/build-report-cross-dto";
import { bundleFromDomainDtos, normalizeCrossInput } from "@/lib/report/cross-analysis/normalize-cross-input";
import { CROSS_NUMERIC_PRECISION } from "@/lib/report/cross-analysis/types";
import { CROSS_P0_METRIC_IDS } from "@/lib/report/cross-analysis/cross-metric-registry";
import {
  computeCrossEfficiencyMetric,
} from "@/lib/report/analytics-engine/calculators/compute-cross-metrics";
import type {
  EconomicAnalyticsDto,
  LaborAnalyticsDto,
  OperationalAnalyticsDto,
  WarehouseAnalyticsDto,
} from "@/lib/report/report-domain-types";
import type { AnalyticsCalculatorContext } from "@/lib/report/analytics-engine/calculator-context";

function assertClose(actual: number, expected: number, precision = CROSS_NUMERIC_PRECISION): void {
  const factor = 10 ** precision;
  assert.equal(Math.round(actual * factor), Math.round(expected * factor));
}

const range = {
  start: startOfLocalDay(new Date("2025-03-01T00:00:00.000Z")),
  end: endOfLocalDay(new Date("2025-03-31T23:59:59.999Z")),
};

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

const bundleDto = bundleFromDomainDtos({
  operational: opDto,
  warehouse: whDto,
  labor: labDto,
  economic: ecoDto,
  invoicesAvailable: true,
});

const input = normalizeCrossInput(bundleDto);
const dto = buildReportCrossDto(bundleDto);

const computeById = {
  cross_efficiency: computeCrossEfficiency,
  cross_parts_job: computeCrossPartsJob,
  cross_cost_job: computeCrossCostJob,
  cross_value_hour: computeCrossValueHour,
} as const;

for (const metricId of CROSS_P0_METRIC_IDS) {
  const legacyMetric = dto.metrics.find((m) => m.metricId === metricId);
  assert.ok(legacyMetric, `dto ${metricId}`);
  const direct = computeById[metricId as keyof typeof computeById](input);
  assert.equal(direct.status, "available");
  assertClose(direct.value, legacyMetric!.value);
}

const emptyCtx = {
  bundle: {
    period: { preset: "custom" as const, start: "2025-03-01", end: "2025-03-31", compareMode: "none" as const },
    range,
    compareRange: null,
    compareMode: "none" as const,
    rangeKey: "empty",
    requirements: {
      metricIds: [],
      invoices: false,
      invoicePayments: false,
      preventivi: false,
      ddt: false,
      timesheet: false,
      schede: false,
      ordini: false,
    },
    integrity: { completate: [], manualByMonth: new Map(), magLog: [], magazzino: [] } as never,
    lavRows: [],
    magazzinoRows: [],
    preventivi: [],
    invoices: [],
    invoicePayments: [],
    ddtDocuments: [],
    ordini: [],
    totalHours: 0,
    timesheetEntries: [],
    timesheetEmployees: [],
    schedeStore: null,
    costoOrario: 0,
    invoicesAvailable: false,
    ddtAvailable: false,
    ordiniAvailable: false,
    loadedSlices: new Set(),
  },
  range,
} as AnalyticsCalculatorContext;

assert.equal(computeCrossEfficiencyMetric(emptyCtx).availability, "not_available");

console.log("cross-metric-parity.test.ts OK");
