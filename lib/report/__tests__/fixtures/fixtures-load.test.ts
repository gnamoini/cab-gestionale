import assert from "node:assert/strict";
import { assertValidReportPayload } from "@/lib/report/contracts/validate-envelope";
import {
  contractBackwardFixture,
  fatturePeriodFixture,
  fleetDisponibilitaFixture,
  FIXTURE_PERIOD,
  lavorazioniPeriodFixture,
  magazzinoScortaFixture,
} from "@/lib/report/__tests__/fixtures";

assert.equal(FIXTURE_PERIOD.start, "2026-06-01");
assert.ok(Number.isFinite(lavorazioniPeriodFixture.openedInPeriod));
assert.ok(Number.isFinite(lavorazioniPeriodFixture.completedInPeriod));
assert.ok(magazzinoScortaFixture.belowMinimumCount >= 0);
assert.equal(
  fatturePeriodFixture.eco_invoices,
  fatturePeriodFixture.eco_fatturato,
  "parity eco_invoices vs eco_fatturato",
);
assert.ok(fleetDisponibilitaFixture.rows.length > 0);

assert.doesNotThrow(() => assertValidReportPayload(contractBackwardFixture));

console.log("fixtures-load.test.ts OK");
