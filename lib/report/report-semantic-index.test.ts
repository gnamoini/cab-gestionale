import assert from "node:assert/strict";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import { buildLavorazioniTemporalModel } from "@/lib/report/lavorazioni-temporal-analysis";
import { buildLavorazioniYearMatrix } from "@/lib/report/lavorazioni-year-matrix";
import {
  avgCloseDays,
  countCompletedByMonth,
  countCompletedInRange,
  sparkFromDailyCompletions,
} from "@/lib/report/lavorazioni-report-selectors";
import { buildTopClientiPeriodo, buildTopMezziPeriodo } from "@/lib/report/report-classifiche";
import { buildReportSemanticIndex } from "@/lib/report/report-semantic-index";

function mockArchived(overrides: Partial<LavorazioneArchiviata> = {}): LavorazioneArchiviata {
  return {
    id: "a1",
    macchina: "Marca Modello",
    targa: "AA000BB",
    matricola: "M1",
    nScuderia: "",
    cliente: "Cliente A",
    utilizzatore: "—",
    cantiere: "",
    addetto: "—",
    note: "",
    statoFinaleId: "completata",
    prioritaFinale: "media",
    dataIngresso: "2025-01-05T10:00:00.000Z",
    dataCompletamento: "2025-03-10T12:00:00.000Z",
    meseCompletamento: "2025-03",
    ...overrides,
  };
}

const completate = [
  mockArchived({ id: "1", dataCompletamento: "2025-01-05T10:00:00.000Z" }),
  mockArchived({ id: "2", dataCompletamento: "2025-01-10T10:00:00.000Z" }),
  mockArchived({ id: "3", dataCompletamento: "2025-03-15T08:00:00.000Z" }),
  mockArchived({ id: "4", dataCompletamento: "2025-06-20T08:00:00.000Z" }),
];

const manual = new Map([["2025-01", 99]]);
const mezzi: never[] = [];
const index = buildReportSemanticIndex({ completate, manualByMonth: manual, mezzi });

const legacyMonth = countCompletedByMonth(completate, manual);
for (const [k, v] of legacyMonth) {
  assert.equal(index.completateByMonth.get(k), v, `month parity ${k}`);
}

const range = {
  start: startOfLocalDay(new Date(2025, 0, 1)),
  end: endOfLocalDay(new Date(2025, 11, 31)),
};

assert.equal(index.completateTotal(range), countCompletedInRange(completate, range, manual));
assert.equal(index.tempoMedio(range), avgCloseDays(completate, range));
assert.deepEqual(index.sparkSeries(range.end), sparkFromDailyCompletions(completate, range.end));
assert.deepEqual(index.topMezzi(range), buildTopMezziPeriodo(mezzi, completate, range));
assert.deepEqual(index.topClienti(range), buildTopClientiPeriodo(completate, range));

const anchor = new Date(2025, 5, 15);
const legacyMatrix = buildLavorazioniYearMatrix(completate, anchor, manual);
const indexMatrix = index.buildYearMatrix(anchor);
assert.deepEqual(indexMatrix.rows, legacyMatrix.rows);

const legacyTemporal = buildLavorazioniTemporalModel(completate, 2025, range, manual);
const indexTemporal = index.buildTemporalModel(2025, range);
assert.equal(indexTemporal.kpis.total, legacyTemporal.kpis.total);
assert.deepEqual(
  indexTemporal.months.map((m) => m.count),
  legacyTemporal.months.map((m) => m.count),
);

assert.ok(index.completateByWeek.size > 0);
assert.ok(index.trendLavorazioni.yearOverYearPct.has(2025));

console.log("report-semantic-index.test.ts OK");
