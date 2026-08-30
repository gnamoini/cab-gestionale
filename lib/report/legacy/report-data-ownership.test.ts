import assert from "node:assert/strict";
import {
  REPORT_DATA_OWNERSHIP,
  isP9EliminationGatePassed,
  getOwnershipEntry,
} from "@/lib/report/legacy/report-data-ownership";
import { LEGACY_CHART_MIGRATION_MATRIX } from "@/lib/report/legacy/legacy-chart-migration-matrix";

for (const entry of REPORT_DATA_OWNERSHIP) {
  assert.ok(entry.businessPurpose.trim(), `${entry.id} needs businessPurpose`);
  assert.ok(entry.reason.trim(), `${entry.id} needs reason`);
  if (entry.ownership === "operational_module" && entry.readiness === "READY") {
    assert.ok(entry.surfaceRef?.trim(), `${entry.id} READY operational_module needs surfaceRef`);
  }
}

assert.equal(isP9EliminationGatePassed(), true, "P9 elimination gate must pass");

const operationalIds = new Set(REPORT_DATA_OWNERSHIP.map((e) => e.id));

for (const chart of LEGACY_CHART_MIGRATION_MATRIX) {
  if (!operationalIds.has(chart.id)) continue;
  const ownership = getOwnershipEntry(chart.id);
  assert.ok(ownership, `${chart.id} should have ownership entry`);
  assert.notEqual(chart.status, "BLOCKED", `${chart.id} must not remain BLOCKED after P9`);
}

const blockedOnReport = LEGACY_CHART_MIGRATION_MATRIX.filter((c) => c.status === "BLOCKED");
assert.equal(blockedOnReport.length, 0);

console.log("report-data-ownership.test.ts OK");
