import assert from "node:assert/strict";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import {
  avgWeeklyCompletateInRange,
  enumerateWeekKeysOverlappingRange,
} from "@/lib/report/avg-weekly-completate";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import { buildCompletateDbMaps } from "@/lib/report/report-completate-maps";
import { buildReportSemanticIndex } from "@/lib/report/report-semantic-index";

function mockArchived(overrides: Partial<LavorazioneArchiviata> = {}): LavorazioneArchiviata {
  return {
    id: "a1",
    macchina: "M",
    targa: "AA000BB",
    matricola: "M1",
    nScuderia: "",
    cliente: "C",
    utilizzatore: "—",
    cantiere: "",
    addetto: "—",
    note: "",
    statoFinaleId: "completata",
    prioritaFinale: "media",
    dataIngresso: "2025-01-05T10:00:00.000Z",
    dataCompletamento: "2025-01-05T10:00:00.000Z",
    meseCompletamento: "2025-01",
    ...overrides,
  };
}

const janRange = {
  start: startOfLocalDay(new Date(2025, 0, 1)),
  end: endOfLocalDay(new Date(2025, 0, 31)),
};

const weekKeysJan = enumerateWeekKeysOverlappingRange(janRange);
assert.equal(weekKeysJan.length, 5, "gennaio 2025 ha 5 settimane nel mese");

const completate = [
  mockArchived({ id: "1", dataCompletamento: "2025-01-03T10:00:00.000Z" }),
  mockArchived({ id: "2", dataCompletamento: "2025-01-04T10:00:00.000Z" }),
  mockArchived({ id: "3", dataCompletamento: "2025-01-12T10:00:00.000Z" }),
];

const { byWeek } = buildCompletateDbMaps(completate);
const plain = avgWeeklyCompletateInRange(janRange, byWeek, completate);
assert.equal(plain.weeklySum, 3);
assert.equal(plain.avg, Math.round((3 / 5) * 10) / 10);

const manual = new Map([["2025-01", 10]]);
const withManual = avgWeeklyCompletateInRange(janRange, byWeek, completate, manual);
assert.equal(withManual.weeklySum, 10);
assert.equal(withManual.avg, 2);

const index = buildReportSemanticIndex({ completate, manualByMonth: manual, mezzi: [] });
assert.equal(index.avgWeeklyCompletate(janRange), withManual.avg);
assert.equal(index.weekCountInRange(janRange), 5);

console.log("avg-weekly-completate.test.ts OK");
