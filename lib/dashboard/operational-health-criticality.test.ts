import assert from "node:assert/strict";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  computeSottoScortaCriticality,
  estimateDaysUnderMinimum,
  sottoScortaDurationWeight,
} from "@/lib/dashboard/operational-health-criticality";

const anchor = new Date("2026-07-13T12:00:00.000Z");

function ricambio(partial: Partial<RicambioMagazzino> & Pick<RicambioMagazzino, "id">): RicambioMagazzino {
  return {
    id: partial.id,
    marca: "",
    codiceFornitoreOriginale: "",
    descrizione: "",
    scorta: partial.scorta ?? 1,
    scortaMinima: partial.scortaMinima ?? 5,
    dataUltimaModifica: partial.dataUltimaModifica ?? "2026-07-13T08:00:00.000Z",
    autoreUltimaModifica: "",
    prezzoFornitoreOriginale: 0,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 0,
    categoria: "",
    note: "",
    compatibilitaMezzi: [],
    fornitoriAlternativi: [],
    usatoInTagliandi: false,
    unitaMisura: "pz",
    ...partial,
  } as RicambioMagazzino;
}

function logEntry(partial: Partial<MagazzinoChangeLogEntry> & Pick<MagazzinoChangeLogEntry, "id" | "ricambioId">): MagazzinoChangeLogEntry {
  return {
    tipo: "update",
    ricambio: "R1",
    autore: "Test",
    at: "2026-07-01T10:00:00.000Z",
    riepilogo: "",
    changes: [],
    annullato: false,
    ...partial,
  };
}

assert.equal(sottoScortaDurationWeight(0.1), 0, "few hours should be negligible");
assert.ok(sottoScortaDurationWeight(21) > sottoScortaDurationWeight(1), "weeks weigh more than hours");

const recent = estimateDaysUnderMinimum(
  ricambio({ id: "r1", scorta: 1, scortaMinima: 5, dataUltimaModifica: "2026-07-13T08:00:00.000Z" }),
  [],
  anchor,
);
assert.ok(recent < 1, "recent under-stock should be under one day");

const longUnder = estimateDaysUnderMinimum(
  ricambio({ id: "r2", scorta: 0, scortaMinima: 4 }),
  [
    logEntry({
      id: "l1",
      ricambioId: "r2",
      at: "2026-06-20T10:00:00.000Z",
      changes: [{ campo: "Scorta", prima: "4", dopo: "0" }],
    }),
  ],
  anchor,
);
assert.ok(longUnder >= 20, "log crossing should yield multi-week duration");

const crit = computeSottoScortaCriticality(
  [
    ricambio({ id: "a", scorta: 1, scortaMinima: 5, dataUltimaModifica: "2026-07-13T10:00:00.000Z" }),
    ricambio({ id: "b", scorta: 0, scortaMinima: 3, dataUltimaModifica: "2026-06-01T10:00:00.000Z" }),
  ],
  [
    logEntry({
      id: "l2",
      ricambioId: "b",
      at: "2026-06-01T10:00:00.000Z",
      changes: [{ campo: "Scorta", prima: "3", dopo: "0" }],
    }),
  ],
  anchor,
);
assert.equal(crit.count, 2);
assert.ok(crit.weightedSeverity > sottoScortaDurationWeight(0.2), "mixed durations increase severity");

console.log("operational-health-criticality.test: OK");
