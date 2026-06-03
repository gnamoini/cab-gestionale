import assert from "node:assert/strict";
import {
  REPORT_UNIVERSE_GESTIONALE_TABLES,
  settingsRenameKindsAffectReport,
} from "@/lib/report/report-universe-constants";

assert.deepEqual(REPORT_UNIVERSE_GESTIONALE_TABLES, [
  "lavorazioni",
  "magazzino_ricambi",
  "movimenti_ricambi",
  "mezzi",
  "app_settings",
]);

assert.equal(settingsRenameKindsAffectReport(["addetto"]), true);
assert.equal(settingsRenameKindsAffectReport(["mag_fornitore"]), true);
assert.equal(settingsRenameKindsAffectReport([]), false);

console.log("invalidate-report-universe.test.ts OK");
