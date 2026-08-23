import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPORT_SECTIONS } from "@/components/report/report-sections-config";
import {
  LEGACY_DOMAIN_MIGRATION_MATRIX,
  listRemovedLegacySectionIds,
} from "@/lib/report/legacy/legacy-migration-matrix";
import { isEconomiaRemovalGatePassed } from "@/lib/report/legacy/economia-removal-gate";
import {
  LEGACY_CHART_MIGRATION_MATRIX,
  listMigratedChartIds,
} from "@/lib/report/legacy/legacy-chart-migration-matrix";
import {
  CROSS_REMOVAL_GATE,
  isDomainRemovalGatePassed,
  LAVORAZIONI_REMOVAL_GATE,
} from "@/lib/report/legacy/domain-removal-gates";
import { isP9EliminationGatePassed } from "@/lib/report/legacy/report-data-ownership";

const removed = listRemovedLegacySectionIds();
assert.ok(removed.includes("dati_economici"), "economia should be REMOVED after gate");
assert.equal(isEconomiaRemovalGatePassed(), true, "economia removal gate must pass before REMOVED");

for (const sectionId of removed) {
  const entry = LEGACY_DOMAIN_MIGRATION_MATRIX.find((e) => e.sectionId === sectionId);
  assert.ok(entry, `matrix entry for ${sectionId}`);
  assert.equal(entry!.status, "REMOVED");
}

assert.equal(isP9EliminationGatePassed(), true, "P9 gate must pass after ownership closure");

assert.equal(isDomainRemovalGatePassed(LAVORAZIONI_REMOVAL_GATE), true, "lavorazioni gate passes after P9");
assert.equal(isDomainRemovalGatePassed(CROSS_REMOVAL_GATE), true, "cross gate passes after P9");

const blockedCharts = LEGACY_CHART_MIGRATION_MATRIX.filter((e) => e.status === "BLOCKED");
assert.equal(blockedCharts.length, 0, "no BLOCKED charts after P9");

const migrated = listMigratedChartIds();
const hubView = readFileSync(
  join(process.cwd(), "components/report/report-hub-view.tsx"),
  "utf8",
);
assert.doesNotMatch(hubView, /LegacyBlockedAccordion/);
assert.doesNotMatch(hubView, /legacy-blocked/);
assert.doesNotMatch(hubView, /ReportSections/);
assert.match(hubView, /report-hub/);

for (const sectionId of removed) {
  const stillInConfig = REPORT_SECTIONS.some((s) => s.id === sectionId);
  assert.ok(stillInConfig, `${sectionId} remains in config for audit trail`);
}

for (const chartId of migrated) {
  const entry = LEGACY_CHART_MIGRATION_MATRIX.find((e) => e.id === chartId);
  if (entry?.biReplacement) {
    assert.ok(entry.biReplacement.trim(), `${chartId} should have biReplacement when set`);
  }
}

console.log("report-legacy-domain-removal.test.ts OK");
