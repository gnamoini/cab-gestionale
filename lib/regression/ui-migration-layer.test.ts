/**
 * UI OS Migration Layer — inferenza schema tests.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  diffSchemas,
  inferPageSchemaFromSource,
  isPageAllowlisted,
  schemaMatchScore,
} from "@/lib/ui-os/ui-migration-layer";

const lavorazioniFixture = `
import { PageToolbar } from "@/components/design-system/page-toolbar";
import { GestionaleListTable } from "@/components/gestionale/global-table";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
export function LavorazioniView() {
  return <PageToolbar search={null} primaryAction={null} filtersPanel={null} filtersExpanded={false} onFiltersToggle={() => {}} />;
}
`;

const reportFixture = `
import { PageHeader } from "@/components/gestionale/page-header";
import { ReportKpiGrid } from "@/components/report/report-kpi-grid";
export function ReportView() {
  return <PageHeader title="Report" />;
}
`;

const lavSchema = inferPageSchemaFromSource("components/gestionale/lavorazioni/lavorazioni-view.tsx", lavorazioniFixture);
assert.equal(lavSchema.toolbar, "standard");
assert.equal(lavSchema.table, "global");
assert.equal(lavSchema.modal, "gestionale-shell");

const reportSchema = inferPageSchemaFromSource("components/report/report-hub-view.tsx", reportFixture);
assert.equal(reportSchema.toolbar, "legacy");
assert.equal(reportSchema.layout, "report-dashboard");

assert.equal(isPageAllowlisted("/lavorazioni:kanban"), true);
assert.equal(isPageAllowlisted("/magazzino"), false);

assert.equal(schemaMatchScore(lavSchema, lavSchema), 100);
assert.ok(diffSchemas(lavSchema, reportSchema).length > 0);

assert.ok(fs.existsSync(path.join(process.cwd(), "lib/ui-os/ui-migration-layer.ts")));

console.log("ui-migration-layer.test.ts OK");
