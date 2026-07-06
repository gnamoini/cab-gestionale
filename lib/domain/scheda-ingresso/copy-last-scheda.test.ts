import assert from "node:assert/strict";
import {
  applyCopyLastSchedaMatch,
  copyLastSchedaIngresso,
} from "@/lib/domain/scheda-ingresso/copy-last-scheda";
import type { SchedaIngressoFields } from "@/types/schede";

const baseFields = (): SchedaIngressoFields => ({
  dataIngresso: "01/01/2026",
  cliente: "Già qui",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "",
  modelloAttrezzatura: "",
  matricola: "ABC",
  nScuderia: "",
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  vin: "",
  targa: "AA111BB",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  noteIntervento: "",
});

const store = {
  "lav-old": {
    lavorazioneId: "lav-old",
    ingresso: {
      tipo: "ingresso" as const,
      sorgente: "generata" as const,
      createdAt: "2025-01-01T10:00:00.000Z",
      updatedAt: "2025-06-01T12:00:00.000Z",
      createdBy: "A",
      updatedBy: "A",
      fileEsterno: null,
      campi: { ...baseFields(), cliente: "Da copia", marcaAttrezzatura: "Bobcat", dataIngresso: "10/10/2020" },
    },
    lavorazioni: null,
    ricambi: null,
  },
};

const attive = [
  {
    id: "lav-old",
    targa: "AA111BB",
    matricola: "ABC",
    macchina: "X",
    nScuderia: "",
    dataIngresso: "2025-01-01",
    cliente: "—",
    cantiere: "",
    utilizzatore: "",
    addetto: "",
    noteInterne: "",
    priorita: "media",
    statoId: "accettazione",
    dataCompletamento: null,
  },
] as const;

const mergeResult = copyLastSchedaIngresso({
  ident: { targa: "AA111BB", matricola: "ABC", nScuderia: "" },
  mode: "merge-empty",
  currentFields: baseFields(),
  mezzi: [],
  schedeStore: store,
  attive: [...attive],
  storico: [],
  excludeLavorazioneId: "lav-new",
});

assert.equal(mergeResult.kind, "single");
if (mergeResult.kind === "single") {
  assert.equal(mergeResult.fields.cliente, "Già qui");
  assert.equal(mergeResult.fields.marcaAttrezzatura, "Bobcat");
  assert.equal(mergeResult.fields.dataIngresso, "01/01/2026");
}

const full = applyCopyLastSchedaMatch("full-snapshot", baseFields(), mergeResult.kind === "single" ? mergeResult.match : (null as never));
assert.equal(full.dataIngresso, "10/10/2020");
assert.equal(full.cliente, "Da copia");

console.log("copy-last-scheda.test.ts: ok");
