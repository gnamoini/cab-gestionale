import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";
import { bundleFromDomainDtos } from "@/lib/report/cross-analysis/normalize-cross-input";
import { sortedCrossMetrics } from "@/lib/report/cross-analysis/cross-metric-registry";
import { CROSS_CONTRACT_VERSION, type ReportCrossDto } from "@/lib/report/cross-analysis/types";

const SNAPSHOT_PATH = path.join(process.cwd(), "test-results/report-v2-cross-contract-snapshot.json");

function buildContractSnapshot(dto: ReportCrossDto) {
  const defsById = new Map(sortedCrossMetrics().map((d) => [d.metricId, d]));
  return {
    contractVersion: dto.contractVersion,
    metrics: dto.metrics.map((metric) => {
      const def = defsById.get(metric.metricId);
      assert.ok(def, `registry def for ${metric.metricId}`);
      return {
        metricId: metric.metricId,
        sourceDatasets: metric.sourceDatasets,
        displayKey: metric.displayKey,
        trust: metric.trust,
        warnings: metric.warnings ?? null,
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

const bundle = bundleFromDomainDtos({
  operational: {
    metrics: [],
    openedInPeriod: 5,
    completedInPeriod: 10,
    archivedTotal: 2,
    cancelledInPeriod: 1,
    backlog: 3,
    avgCloseDays: 4,
    lateCount: 0,
    clientsServed: 6,
  },
  warehouse: {
    metrics: [],
    partsUsedQty: 20,
    movementValue: 500,
    criticalStockCount: 1,
    ordersCount: 2,
  },
  labor: {
    metrics: [],
    totalHours: 40,
    actualLaborHours: 32,
    completedJobs: 10,
    avgHoursPerJob: 4,
    actualHoursPerJob: 3.2,
    manodoperaCost: 800,
  },
  economic: {
    metrics: [],
    preventiviCount: 3,
    preventiviValue: 1000,
    invoicesBilled: 2000,
    ddtCount: 5,
  },
  invoicesAvailable: true,
});

const dto = buildReportCrossDto(bundle);
assert.equal(dto.contractVersion, CROSS_CONTRACT_VERSION);

const snapshot = buildContractSnapshot(dto);
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

if (!fs.existsSync(path.dirname(SNAPSHOT_PATH))) {
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
}

if (!fs.existsSync(SNAPSHOT_PATH)) {
  fs.writeFileSync(SNAPSHOT_PATH, serialized, "utf8");
  console.log("cross-contract-snapshot.test.ts wrote initial snapshot");
} else {
  const expected = fs.readFileSync(SNAPSHOT_PATH, "utf8");
  assert.equal(serialized, expected, "cross contract snapshot mismatch");
}

console.log("cross-contract-snapshot.test.ts OK");
