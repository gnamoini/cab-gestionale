import assert from "node:assert/strict";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import {
  buildReportDerivedBundle,
  fingerprintReportSnapshot,
  getMagPeriodAgg,
  getMagazzinoMonthlyRowsForRange,
  resetReportDerivedCacheForTests,
} from "@/lib/report/report-derived-cache";
import { countCompletedInRange } from "@/lib/report/lavorazioni-report-selectors";

function mockArchived(id: string, dataCompletamento: string): LavorazioneArchiviata {
  return {
    id,
    macchina: "X",
    targa: "—",
    matricola: "—",
    nScuderia: "",
    cliente: "C",
    utilizzatore: "—",
    cantiere: "",
    addetto: "—",
    note: "",
    statoFinaleId: "completata",
    prioritaFinale: "media",
    dataIngresso: "2024-12-01T10:00:00.000Z",
    dataCompletamento,
    meseCompletamento: dataCompletamento.slice(0, 7),
  };
}

const completate = [mockArchived("1", "2025-03-10T12:00:00.000Z")];
const manualByMonth = new Map([["2025-01", 10]]);
const queryMeta = [
  {
    source: "lavorazioni" as const,
    isError: false,
    isFetching: false,
    dataUpdatedAt: 1000,
    rowCount: 1,
  },
];

resetReportDerivedCacheForTests();

const fp1 = fingerprintReportSnapshot({
  completate,
  magLog: [],
  magazzino: [],
  manualByMonth,
  queryMeta,
});

const b1 = buildReportDerivedBundle({
  completate,
  manualByMonth,
  mezzi: [],
  magLog: [],
  magazzino: [],
  queryMeta,
});

const b2 = buildReportDerivedBundle({
  completate,
  manualByMonth,
  mezzi: [],
  magLog: [],
  magazzino: [],
  queryMeta,
});

assert.equal(b1, b2, "same fingerprint returns same bundle reference");
assert.equal(b1.semanticIndex, b2.semanticIndex);

const range = {
  start: startOfLocalDay(new Date(2025, 0, 1)),
  end: endOfLocalDay(new Date(2025, 11, 31)),
};

assert.equal(
  b1.semanticIndex.completateTotal(range),
  countCompletedInRange(completate, range, manualByMonth),
  "manual override parity via semantic index",
);

const agg1 = getMagPeriodAgg(b1, [], range, new Date(2025, 5, 15));
const agg2 = getMagPeriodAgg(b1, [], range, new Date(2025, 5, 15));
assert.equal(agg1, agg2, "mag period agg cached per range key");

getMagazzinoMonthlyRowsForRange(b1, [], range, new Date(2025, 5, 15), {});
getMagPeriodAgg(b1, [], range, new Date(2025, 5, 15));
assert.equal(b1.magMonthRowsCache.size, 1, "monthly rows cached once for KPI+section");

const fp2 = fingerprintReportSnapshot({
  completate: [...completate, mockArchived("2", "2025-04-01T12:00:00.000Z")],
  magLog: [],
  magazzino: [],
  manualByMonth,
  queryMeta,
});

assert.notEqual(fp1, fp2);

const fp3 = fingerprintReportSnapshot({
  completate,
  magLog: [{ id: "m1", ricambioId: "r1", at: "2025-01-01T00:00:00.000Z", tipo: "update", ricambio: "X", autore: "S", riepilogo: "", changes: [] }],
  magazzino: [],
  manualByMonth,
  queryMeta,
});

assert.notEqual(fp1, fp3, "mag log content hint changes fingerprint");

resetReportDerivedCacheForTests();
