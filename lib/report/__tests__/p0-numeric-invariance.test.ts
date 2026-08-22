import assert from "node:assert/strict";
import { lavorazioniPeriodFixture } from "@/lib/report/__tests__/fixtures/lavorazioni-period.fixture";
import { fatturePeriodFixture } from "@/lib/report/__tests__/fixtures/fatture-period.fixture";
import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";

/** Gate 5 — baseline numerica fixture; differenze non classificate = FAIL. */
assert.equal(
  fatturePeriodFixture.eco_invoices,
  fatturePeriodFixture.eco_fatturato,
  "alias eco_invoices/eco_fatturato parity",
);
assert.equal(resolveCanonicalMetricId("eco_invoices"), "eco_fatturato");
assert.ok(lavorazioniPeriodFixture.openedInPeriod > 0);
assert.ok(lavorazioniPeriodFixture.completedInPeriod > 0);

console.log("p0-numeric-invariance.test.ts OK");
