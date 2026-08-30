import assert from "node:assert/strict";
import { resolveAnalyticsDataRequirements } from "@/lib/report/analytics-engine/resolve-analytics-data-requirements";

const ecoOnly = resolveAnalyticsDataRequirements(["eco_fatturato"]);
assert.equal(ecoOnly.invoices, true);
assert.equal(ecoOnly.invoicePayments, true);
assert.equal(ecoOnly.timesheet, false);
assert.equal(ecoOnly.schede, false);
assert.equal(ecoOnly.preventivi, false);

const oreOnly = resolveAnalyticsDataRequirements(["presence_hours_total"]);
assert.equal(oreOnly.timesheet, true);
assert.equal(oreOnly.invoices, false);

const schedeOnly = resolveAnalyticsDataRequirements(["actual_labor_hours_total"]);
assert.equal(schedeOnly.schede, true);
assert.equal(schedeOnly.invoices, false);

const costTot = resolveAnalyticsDataRequirements(["cost-tot"]);
assert.equal(costTot.schede, true);
assert.equal(costTot.invoices, false);

console.log("resolve-analytics-data-requirements.test.ts OK");
