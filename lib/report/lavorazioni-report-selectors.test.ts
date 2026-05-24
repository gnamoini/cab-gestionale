import assert from "node:assert/strict";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import {
  buildReportLavorazioniBundle,
  countCompletedByMonth,
  countCompletedInRange,
  monthKeysOverlappingRange,
  uniqueClientiServiti,
} from "@/lib/report/lavorazioni-report-selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

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

function mockRow(overrides: Partial<LavorazioneListRow> = {}): LavorazioneListRow {
  return {
    id: "lav-1",
    mezzo_id: "mezzo-1",
    stato: "da_lavorare",
    priorita: "media",
    data_ingresso: "2025-01-10T10:00:00.000Z",
    data_uscita: null,
    note: null,
    created_by: null,
    created_at: "2025-01-10T10:00:00.000Z",
    updated_at: "2025-06-01T12:00:00.000Z",
    archived: false,
    archived_at: null,
    deleted_at: null,
    mezzo: null,
    ...overrides,
  };
}

const bundle = buildReportLavorazioniBundle([
  mockRow({ id: "active" }),
  mockRow({
    id: "active-completata-ui",
    archived: false,
    stato: "completata",
    data_uscita: "2025-03-15T08:00:00.000Z",
  }),
  mockRow({
    id: "arch-no-close",
    archived: true,
    archived_at: null,
    data_uscita: null,
  }),
  mockRow({
    id: "arch-closed",
    archived: true,
    archived_at: "2025-03-15T08:00:00.000Z",
    data_uscita: "2025-03-15T08:00:00.000Z",
  }),
]);

assert.equal(bundle.attive.length, 2);
assert.equal(bundle.storico.length, 2);
assert.equal(bundle.completate.length, 1);
assert.equal(bundle.completate[0]?.id, "arch-closed");

const archivioOnly = buildReportLavorazioniBundle(
  [mockRow({ id: "active" })],
  [
    mockRow({
      id: "arch-closed",
      archived: true,
      archived_at: "2025-03-15T08:00:00.000Z",
      data_uscita: "2025-03-15T08:00:00.000Z",
    }),
  ],
);
assert.equal(archivioOnly.completate.length, 1, "dedicated archivio fetch drives completate");

const range = {
  start: startOfLocalDay(new Date(2025, 2, 1)),
  end: endOfLocalDay(new Date(2025, 2, 31)),
};

assert.equal(countCompletedInRange([mockArchived()], range), 1);

assert.equal(
  uniqueClientiServiti(
    [
      mockArchived({ cliente: "Cliente A" }),
      mockArchived({ id: "a2", cliente: "Cliente B", dataCompletamento: "2025-04-01T12:00:00.000Z" }),
    ],
    range,
  ),
  1,
  "clienti serviti counts only archive closures in range",
);

const manual = new Map([["2025-03", 42]]);
assert.equal(countCompletedInRange([], range, manual), 42);
assert.equal(countCompletedByMonth([], manual).get("2025-03"), 42);

const keys = monthKeysOverlappingRange(range);
assert.ok(keys.includes("2025-03"));

console.log("lavorazioni-report-selectors.test.ts OK");
