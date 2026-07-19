import assert from "node:assert/strict";
import {
  REPORT_KPI_CATALOG,
  assertReportKpiCatalogUnique,
  assertStripSectionKpiDisjoint,
  reportKpiIdsForSection,
} from "@/lib/report/report-kpi-catalog";

assert.doesNotThrow(() => assertReportKpiCatalogUnique());
assert.doesNotThrow(() => assertStripSectionKpiDisjoint());

for (const entry of REPORT_KPI_CATALOG) {
  assert.ok(entry.id.trim().length > 0, "KPI id required");
  assert.ok(entry.label.trim().length > 0, `KPI ${entry.id} label required`);
  assert.ok(entry.owner, `KPI ${entry.id} owner required`);
  assert.ok(entry.source.trim().length > 0, `KPI ${entry.id} source required`);
  assert.notEqual(entry.section, "strip", `KPI ${entry.id} must not live in strip`);
}

const lavIds = reportKpiIdsForSection("lavorazioni");
assert.ok(lavIds.length > 0, "lavorazioni KPIs required");
assert.equal(new Set(lavIds).size, lavIds.length, "lavorazioni KPI ids unique");
assert.equal(reportKpiIdsForSection("strip").length, 0);

console.log("report-kpi-catalog.test.ts OK");
