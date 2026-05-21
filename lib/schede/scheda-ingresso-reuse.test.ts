import assert from "node:assert/strict";
import {
  findLastSchedaIngressoForIdent,
  hasSchedaIngressoIdentLookup,
  mergeSchedaIngressoFields,
} from "@/lib/schede/scheda-ingresso-reuse";
import type { SchedaIngressoFields } from "@/types/schede";

const baseFields = (): SchedaIngressoFields => ({
  dataIngresso: "01/01/2026",
  cliente: "",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "",
  modelloAttrezzatura: "",
  matricola: "ABC123",
  nScuderia: "",
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  targa: "AA111BB",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  noteIntervento: "",
});

assert.equal(hasSchedaIngressoIdentLookup("AA111BB", ""), true);
assert.equal(hasSchedaIngressoIdentLookup("", ""), false);

const merged = mergeSchedaIngressoFields(
  { ...baseFields(), cliente: "Già inserito" },
  { ...baseFields(), cliente: "Da copia", marcaAttrezzatura: "Bobcat", dataIngresso: "10/10/2020" },
);
assert.equal(merged.cliente, "Già inserito");
assert.equal(merged.marcaAttrezzatura, "Bobcat");
assert.equal(merged.dataIngresso, "01/01/2026");

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
      campi: { ...baseFields(), cliente: "Storico Srl" },
    },
    lavorazioni: null,
    ricambi: null,
  },
};

const hit = findLastSchedaIngressoForIdent(
  "AA111BB",
  "ABC123",
  [],
  store,
  [
    {
      id: "lav-old",
      targa: "AA111BB",
      matricola: "ABC123",
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
  ],
  [],
  { excludeLavorazioneId: "lav-new" },
);

assert.ok(hit);
assert.equal(hit.campi.cliente, "Storico Srl");

console.log("scheda-ingresso-reuse.test.ts: ok");
