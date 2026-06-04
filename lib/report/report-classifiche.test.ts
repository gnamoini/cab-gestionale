import assert from "node:assert/strict";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { buildTopMezziPeriodo, buildTopRicambiPeriodo } from "@/lib/report/report-classifiche";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";

const range = {
  start: startOfLocalDay(new Date("2025-03-01T00:00:00.000Z")),
  end: endOfLocalDay(new Date("2025-03-31T23:59:59.999Z")),
};

const ricambio: RicambioMagazzino = defaultRicambioMagazzinoFields({
  id: "r1",
  marca: "Bosch",
  codiceFornitoreOriginale: "X1",
  descrizione: "Filtro",
  scorta: 5,
  prezzoFornitoreOriginale: 10,
  prezzoVendita: 12,
});

const magLog: MagazzinoChangeLogEntry[] = [
  {
    id: "log-orphan",
    tipo: "update",
    ricambioId: "r-deleted",
    ricambio: "",
    autore: "test",
    at: "2025-03-10T12:00:00.000Z",
    riepilogo: "",
    changes: [{ campo: "Scorta", prima: "5", dopo: "2" }],
    annullato: false,
  },
  {
    id: "log-valid",
    tipo: "update",
    ricambioId: "r1",
    ricambio: "",
    autore: "test",
    at: "2025-03-11T12:00:00.000Z",
    riepilogo: "",
    changes: [{ campo: "Scorta", prima: "10", dopo: "7" }],
    annullato: false,
  },
];

const tops = buildTopRicambiPeriodo(magLog, [ricambio], range);
assert.equal(tops.length, 1);
assert.equal(tops[0]?.id, "r1");
assert.equal(tops[0]?.qtaUscita, 3);

const rangeMezzi = {
  start: startOfLocalDay(new Date(2025, 2, 1)),
  end: endOfLocalDay(new Date(2025, 2, 31)),
};

const mezzi: MezzoGestito[] = [
  {
    id: "m1",
    marca: "Schmidt",
    modello: "Cleango 400",
    targa: "AA111",
    matricola: "LE024660",
    numeroScuderia: "",
    cliente: "B-Energy",
    utilizzatore: "—",
    tipoAttrezzatura: "—",
    anno: 2020,
    oreKm: 0,
    statoAttuale: "Operativo",
    dataUltimaUscita: "",
    note: "",
    priorita: "normale",
  },
  {
    id: "m2",
    marca: "Schmidt",
    modello: "Cleango 400 ET",
    targa: "BB222",
    matricola: "LE024660",
    numeroScuderia: "",
    cliente: "Altro",
    utilizzatore: "—",
    tipoAttrezzatura: "—",
    anno: 2020,
    oreKm: 0,
    statoAttuale: "Operativo",
    dataUltimaUscita: "",
    note: "",
    priorita: "normale",
  },
];

const completate: LavorazioneArchiviata[] = [
  {
    id: "lav-1",
    mezzoId: "m1",
    macchina: "Schmidt Cleango 400",
    targa: "AA111",
    matricola: "LE024660",
    nScuderia: "",
    cliente: "B-Energy",
    utilizzatore: "—",
    cantiere: "",
    addetto: "—",
    noteInterne: "",
    statoFinaleId: "completata",
    prioritaFinale: "media",
    dataIngresso: "2025-03-01T10:00:00.000Z",
    dataCompletamento: "2025-03-10T12:00:00.000Z",
    meseCompletamento: "2025-03",
  },
  {
    id: "lav-2",
    mezzoId: "m1",
    macchina: "Schmidt Cleango 400",
    targa: "AA111",
    matricola: "LE024660",
    nScuderia: "",
    cliente: "B-Energy",
    utilizzatore: "—",
    cantiere: "",
    addetto: "—",
    noteInterne: "",
    statoFinaleId: "completata",
    prioritaFinale: "media",
    dataIngresso: "2025-03-05T10:00:00.000Z",
    dataCompletamento: "2025-03-12T12:00:00.000Z",
    meseCompletamento: "2025-03",
  },
  {
    id: "lav-active-ui",
    mezzoId: "m2",
    macchina: "Schmidt Cleango 400 ET",
    targa: "BB222",
    matricola: "LE024660",
    nScuderia: "",
    cliente: "Altro",
    utilizzatore: "—",
    cantiere: "",
    addetto: "—",
    noteInterne: "",
    statoFinaleId: "completata",
    prioritaFinale: "media",
    dataIngresso: "2025-03-06T10:00:00.000Z",
    dataCompletamento: "2025-04-01T12:00:00.000Z",
    meseCompletamento: "2025-04",
  },
];

const topMezzi = buildTopMezziPeriodo(mezzi, completate, rangeMezzi);
assert.equal(topMezzi.length, 1);
assert.equal(topMezzi[0]?.id, "m1");
assert.equal(topMezzi[0]?.interventi, 2, "counts archived completions in range once per lavorazione");

console.log("report-classifiche.test.ts OK");
