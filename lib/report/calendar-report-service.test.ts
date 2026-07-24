import assert from "node:assert/strict";
import {
  buildMonthHasDataMap,
  getDaySummary,
  getWeekSummary,
  weekStartYmdFromYmd,
} from "@/lib/report/calendar-report-service";
import { buildReportSemanticIndex } from "@/lib/report/report-semantic-index";
import type { LavorazioneAttiva, LavorazioneArchiviata } from "@/lib/lavorazioni/types";

const attive: LavorazioneAttiva[] = [
  {
    id: "a1",
    macchina: "Escavatore",
    targa: "AB123CD",
    matricola: "M1",
    nScuderia: "",
    cliente: "Cliente A",
    utilizzatore: "",
    cantiere: "",
    statoId: "in_lavorazione",
    priorita: "media",
    addetto: "",
    note: "",
    dataIngresso: "2025-06-10T09:00:00.000Z",
    dataCompletamento: null,
  },
];

const completate: LavorazioneArchiviata[] = [
  {
    id: "c1",
    macchina: "Dumper",
    targa: "XY999ZZ",
    matricola: "M2",
    nScuderia: "",
    cliente: "Cliente B",
    utilizzatore: "",
    cantiere: "",
    addetto: "",
    note: "",
    statoFinaleId: "completata",
    prioritaFinale: "media",
    dataIngresso: "2025-06-09T08:00:00.000Z",
    dataCompletamento: "2025-06-10T17:00:00.000Z",
    meseCompletamento: "2025-06",
  },
];

const semanticIndex = buildReportSemanticIndex({
  completate,
  manualByMonth: new Map(),
  mezzi: [],
});

const baseInput = {
  anchor: new Date("2025-06-10T12:00:00.000Z"),
  attive,
  storico: completate,
  completate,
  manualByMonth: new Map<string, number>(),
  mezzi: [],
  magazzino: [],
  magLog: [],
  lavRows: [],
  semanticIndex,
  queryMeta: [],
};

const day = getDaySummary(baseInput, "2025-06-10");
assert.ok(day);
assert.equal(day.entriesCount, 1, "ingresso 10 giu");
assert.equal(day.exitsCount, 1, "uscita 10 giu");
assert.equal(day.operationalStatus, "active");

const weekStart = weekStartYmdFromYmd("2025-06-10");
assert.equal(weekStart, "2025-06-09", "settimana lun 9 giu");

const week = getWeekSummary(baseInput, weekStart!);
assert.ok(week);
assert.equal(week.entriesCount, 2, "ingressi 9 e 10 giu");

const hasData = buildMonthHasDataMap(baseInput, "2025-06");
assert.equal(hasData["2025-06-10"], true);
assert.equal(hasData["2025-06-01"], undefined);

console.log("calendar-report-service.test.ts OK");
