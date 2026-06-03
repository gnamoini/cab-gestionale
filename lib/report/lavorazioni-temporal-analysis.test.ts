import assert from "node:assert/strict";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import {
  buildLavorazioniTemporalModel,
  weekIndexInMonthFromIso,
} from "@/lib/report/lavorazioni-temporal-analysis";

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
    noteInterne: "",
    statoFinaleId: "completata",
    prioritaFinale: "media",
    dataIngresso: "2025-01-05T10:00:00.000Z",
    dataCompletamento: "2025-03-10T12:00:00.000Z",
    meseCompletamento: "2025-03",
    ...overrides,
  };
}

const year2025 = {
  start: startOfLocalDay(new Date(2025, 0, 1)),
  end: endOfLocalDay(new Date(2025, 11, 31)),
};

assert.equal(weekIndexInMonthFromIso("2025-03-10T12:00:00.000Z"), 2);
assert.equal(weekIndexInMonthFromIso("2025-03-01T12:00:00.000Z"), 1);
assert.equal(weekIndexInMonthFromIso("2025-03-29T12:00:00.000Z"), 5);

const completate = [
  mockArchived({ id: "1", dataCompletamento: "2025-01-05T10:00:00.000Z" }),
  mockArchived({ id: "2", dataCompletamento: "2025-01-10T10:00:00.000Z" }),
  mockArchived({ id: "3", dataCompletamento: "2025-03-15T08:00:00.000Z" }),
  mockArchived({ id: "4", dataCompletamento: "2025-06-20T08:00:00.000Z" }),
  mockArchived({ id: "5", dataCompletamento: "2025-06-22T08:00:00.000Z" }),
  mockArchived({ id: "6", dataCompletamento: null as unknown as string }),
  mockArchived({ id: "7", dataCompletamento: "2024-06-01T10:00:00.000Z" }),
];

const model = buildLavorazioniTemporalModel(completate, 2025, year2025);

assert.equal(model.kpis.total, 5);
assert.equal(model.months[0]!.count, 2);
assert.equal(model.months[2]!.count, 1);
assert.equal(model.months[5]!.count, 2);
assert.equal(model.kpis.peakMonth?.monthIndex, 0);
assert.equal(model.kpis.peakMonth?.count, 2);

const janWeeks = model.months[0]!.weeks;
assert.equal(janWeeks.find((w) => w.weekIndex === 1)?.count, 1);
assert.equal(janWeeks.find((w) => w.weekIndex === 2)?.count, 1);

const junWeeks = model.months[5]!.weeks;
const junTotal = junWeeks.reduce((s, w) => s + w.count, 0);
assert.equal(junTotal, 2);

assert.equal(model.kpis.activeMonths, 3);
assert.ok(model.kpis.avgMonthly > 0);
assert.ok(model.kpis.peakWeek != null);

const partialRange = {
  start: startOfLocalDay(new Date(2025, 0, 1)),
  end: endOfLocalDay(new Date(2025, 2, 31)),
};
const partial = buildLavorazioniTemporalModel(completate, 2025, partialRange);
assert.equal(partial.kpis.total, 3);
assert.equal(partial.months[5]!.count, 0);
assert.equal(partial.months[5]!.inEffectiveRange, false);

const manual = new Map([["2025-01", 99]]);
const withManual = buildLavorazioniTemporalModel(completate, 2025, year2025, manual);
assert.equal(withManual.months[0]!.count, 99);
assert.equal(withManual.months[0]!.hasManualOverride, true);
assert.equal(withManual.kpis.total, 99 + 1 + 2);

console.log("lavorazioni-temporal-analysis.test.ts OK");
