import assert from "node:assert/strict";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { buildLavorazioniYearMatrix } from "@/lib/report/lavorazioni-year-matrix";

function mockArchived(dataCompletamento: string): LavorazioneArchiviata {
  return {
    id: "a1",
    macchina: "X",
    targa: "—",
    matricola: "—",
    nScuderia: "",
    cliente: "C",
    utilizzatore: "—",
    cantiere: "",
    addetto: "—",
    noteInterne: "",
    statoFinaleId: "completata",
    prioritaFinale: "media",
    dataIngresso: "2024-12-01T10:00:00.000Z",
    dataCompletamento,
    meseCompletamento: dataCompletamento.slice(0, 7),
  };
}

const anchor = new Date(2025, 5, 15);
const { rows, manualMonthKeys } = buildLavorazioniYearMatrix(
  [mockArchived("2025-02-10T12:00:00.000Z")],
  anchor,
  new Map([["2025-01", 10]]),
);

const feb2025 = rows.find((r) => r.year === 2025);
assert.equal(feb2025?.months[1], 1, "Feb from DB");
assert.equal(feb2025?.months[0], 10, "Jan from manual override");
assert.ok(manualMonthKeys.has("2025-01"));

console.log("lavorazioni-year-matrix.test.ts OK");
