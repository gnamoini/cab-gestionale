import assert from "node:assert/strict";
import { buildCompletateDbMaps, resolveReportMonthCompletedCount, reportMonthKeyFromArchiviata } from "@/lib/report/report-completate-maps";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { buildReportLavorazioniBundle } from "@/lib/report/lavorazioni-report-selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function mockArchivedRow(overrides: Partial<LavorazioneListRow> = {}): LavorazioneListRow {
  return {
    id: "lav-arch",
    mezzo_id: "mezzo-1",
    stato: "completata",
    priorita: "media",
    data_ingresso: "2026-07-01T10:00:00.000Z",
    data_uscita: null,
    note: null,
    created_by: null,
    created_at: "2026-07-01T10:00:00.000Z",
    updated_at: "2026-07-20T15:00:00.000Z",
    archived: true,
    archived_at: null,
    deleted_at: null,
    mezzo: null,
    ...overrides,
  };
}

const legacyBundle = buildReportLavorazioniBundle([], [mockArchivedRow(), mockArchivedRow({ id: "lav-aug", updated_at: "2026-08-12T12:00:00.000Z" })]);
assert.equal(legacyBundle.completate.length, 2, "archivio legacy entra in completate");
const legacyMaps = buildCompletateDbMaps(legacyBundle.completate);
assert.equal(legacyMaps.byMonth.get("2026-07"), 1);
assert.equal(legacyMaps.byMonth.get("2026-08"), 1);

const db = new Map([
  ["2026-07", 4],
  ["2026-08", 9],
  ["2026-06", 2],
]);
const manual = new Map([["2026-07", 99]]);

assert.equal(resolveReportMonthCompletedCount("2026-07", db, manual), 99, "mese importato = solo manuale");
assert.equal(resolveReportMonthCompletedCount("2026-08", db, manual), 9, "altri mesi = DB");
assert.equal(resolveReportMonthCompletedCount("2026-07", db, new Map([["2026-07", 0]])), 4, "zero manuale = DB");
assert.equal(resolveReportMonthCompletedCount("2026-06", db, manual), 2);
assert.equal(resolveReportMonthCompletedCount("2026-05", db, manual), 0);

const legacyKey = reportMonthKeyFromArchiviata({
  dataCompletamento: "",
  meseCompletamento: "2026-07",
});
assert.equal(legacyKey, "2026-07", "fallback meseCompletamento senza dataCompletamento");

const meseWins = reportMonthKeyFromArchiviata({
  dataCompletamento: "2025-12-01T00:00:00.000Z",
  meseCompletamento: "2026-07",
});
assert.equal(meseWins, "2026-07", "meseCompletamento SSOT su dataCompletamento discordante");

console.log("report-completate-maps.test.ts OK");
