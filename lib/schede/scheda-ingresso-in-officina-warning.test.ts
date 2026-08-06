import assert from "node:assert/strict";
import { findActiveLavorazioneForSchedaIngressoIdent } from "@/lib/schede/scheda-ingresso-in-officina-warning";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

function ingressoCampi(overrides: Partial<SchedaIngressoFields>): SchedaIngressoFields {
  return {
    dataIngresso: "01/01/2026",
    cliente: "Rossi",
    cantiere: "",
    utilizzatore: "",
    tipoAttrezzatura: "",
    marcaAttrezzatura: "CAT",
    modelloAttrezzatura: "320",
    matricola: "",
    nScuderia: "",
    oreLavoro: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    vin: "",
    targa: "",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: "",
    richiedente: "",
    richiedenteTelefono: "",
    ...overrides,
  };
}

const attive: LavorazioneAttiva[] = [
  {
    id: "lav-1",
    codice: "26-0001",
    macchina: "CAT 320",
    cliente: "Rossi",
    targa: "AB123CD",
    matricola: "",
    nScuderia: "",
    utilizzatore: "",
    cantiere: "",
    statoId: "accettazione",
    priorita: "media",
    addetto: "",
    note: "",
    dataIngresso: "2026-01-01",
    dataCompletamento: null,
  },
];

const store: LavorazioneSchedeStore = {
  "lav-1": {
    lavorazioneId: "lav-1",
    ingresso: {
      tipo: "ingresso",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02T10:00:00.000Z",
      createdBy: "test",
      updatedBy: "test",
      sorgente: "generata",
      fileEsterno: null,
      campi: ingressoCampi({ targa: "AB123CD" }),
    },
    lavorazioni: null,
    ricambi: null,
  },
};

const hit = findActiveLavorazioneForSchedaIngressoIdent(
  ingressoCampi({ targa: "AB123CD" }),
  [],
  store,
  attive,
);
assert.equal(hit?.lavorazioneId, "lav-1");

const excluded = findActiveLavorazioneForSchedaIngressoIdent(
  ingressoCampi({ targa: "AB123CD" }),
  [],
  store,
  attive,
  "lav-1",
);
assert.equal(excluded, null);

const miss = findActiveLavorazioneForSchedaIngressoIdent(
  ingressoCampi({ targa: "ZZ999ZZ" }),
  [],
  store,
  attive,
);
assert.equal(miss, null);

console.log("scheda-ingresso-in-officina-warning.test.ts OK");
