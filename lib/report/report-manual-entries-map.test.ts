import assert from "node:assert/strict";
import { isAllowedReportManualMonth, isPastReportMonth, isReportLavorazioniLiveMonth } from "@/lib/report/report-manual-entries-map";
import { isReportManualMonthOverride, resolveReportMonthCompletedCount } from "@/lib/report/report-completate-maps";

const aug20 = new Date(2026, 7, 20, 12, 0, 0, 0);

assert.equal(isAllowedReportManualMonth("2026-07-01", aug20), true, "luglio consentito");
assert.equal(isAllowedReportManualMonth("2026-08-01", aug20), true, "mese corrente consentito");
assert.equal(isAllowedReportManualMonth("2026-09-01", aug20), false, "mese futuro bloccato");
assert.equal(isPastReportMonth("2026-08-01", aug20), true, "alias compat mese corrente");

const db = new Map([["2026-07", 12]]);
const manualZero = new Map([["2026-07", 0]]);
assert.equal(resolveReportMonthCompletedCount("2026-07", db, manualZero), 12, "override a zero non blocca DB");
assert.equal(isReportManualMonthOverride(manualZero, "2026-07"), false);

assert.equal(isReportLavorazioniLiveMonth("2026-07"), true);
assert.equal(isReportLavorazioniLiveMonth("2026-06"), false);
assert.equal(resolveReportMonthCompletedCount("2026-07", new Map([["2026-07", 5]]), new Map([["2026-07", 99]])), 99, "override non-zero vince su DB");

console.log("report-manual-entries-map.test.ts OK");
