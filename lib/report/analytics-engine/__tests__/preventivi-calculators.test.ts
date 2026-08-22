import assert from "node:assert/strict";
import {
  computeEcoPreventiviValore,
  computeWinRatePreventivi,
} from "@/lib/report/analytics-engine/calculators";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import type { PreventivoRecord } from "@/lib/preventivi/types";

const range = {
  start: startOfLocalDay(new Date(2026, 7, 1)),
  end: endOfLocalDay(new Date(2026, 7, 31)),
};

function mockPreventivo(overrides: Partial<PreventivoRecord> = {}): PreventivoRecord {
  return {
    id: "p1",
    codice: "PRV-1",
    cliente: "Cliente",
    statoWorkflow: "inviato",
    statoCliente: "accettato",
    dataCreazione: "2026-08-10T10:00:00.000Z",
    aggiornatoAt: "2026-08-10T10:00:00.000Z",
    totaleFinale: 1000,
    ...overrides,
  } as PreventivoRecord;
}

const bundle = {
  preventivi: [
    mockPreventivo(),
    mockPreventivo({ id: "p2", totaleFinale: 500, statoCliente: "rifiutato" }),
    mockPreventivo({ id: "p3", statoWorkflow: "bozza", totaleFinale: 9000 }),
  ],
} as Pick<ReportAnalyticsSourceBundle, "preventivi">;

assert.equal(computeEcoPreventiviValore({ bundle, range } as never).value, 1500);

const winBundle = {
  preventivi: [
    mockPreventivo({ statoCliente: "accettato" }),
    mockPreventivo({ id: "p4", statoCliente: "rifiutato" }),
  ],
} as Pick<ReportAnalyticsSourceBundle, "preventivi">;

assert.equal(computeWinRatePreventivi({ bundle: winBundle, range } as never).value, 50);

console.log("preventivi-calculators.test.ts OK");
