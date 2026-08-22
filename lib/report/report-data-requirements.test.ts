import assert from "node:assert/strict";
import { resolveReportDataRequirements } from "@/lib/report/report-data-requirements";
import type { ReportSectionId } from "@/components/report/report-sections-config";

const none = new Set<ReportSectionId>();
const reqNone = resolveReportDataRequirements(none, false);
assert.equal(reqNone.preventivi, false);
assert.equal(reqNone.invoices, false);
assert.equal(reqNone.schede, false);

const ecoOnly = new Set<ReportSectionId>(["dati_economici"]);
const reqEco = resolveReportDataRequirements(ecoOnly, false);
assert.equal(reqEco.preventivi, true);
assert.equal(reqEco.invoices, true);
assert.equal(reqEco.ddt, true);
assert.equal(reqEco.schede, true);
assert.equal(reqEco.schedeScopes.needsLaborCost, "completed_in_period");

const oreOnly = new Set<ReportSectionId>(["ore_lavorate"]);
const reqOre = resolveReportDataRequirements(oreOnly, false);
assert.equal(reqOre.timesheet, true);
assert.equal(reqOre.schedeScopes.needsActualHours, "hours_in_period");

console.log("report-data-requirements.test.ts OK");
