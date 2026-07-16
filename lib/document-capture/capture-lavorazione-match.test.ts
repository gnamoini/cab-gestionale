import assert from "node:assert/strict";
import {
  findActiveLavorazioneWithIngressoForCaptureIdent,
  ingressoIdentMatchesCapture,
  resolveCaptureIdentFromFields,
} from "@/lib/document-capture/capture-lavorazione-match";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

function row(key: string, value: string): CaptureFieldRow {
  return { field_key: key, confirmed_value: value, normalized_value: value };
}

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
    noteIntervento: "",
    ...overrides,
  };
}

const ident = resolveCaptureIdentFromFields([
  row("cliente", "Rossi"),
  row("targa_matricola", "AB123CD"),
]);
assert.equal(ident.targa, "AB123CD");
assert.equal(ident.cliente, "Rossi");

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
    noteInterne: "",
    dataIngresso: "2026-01-01",
    dataCompletamento: null,
  },
  {
    id: "lav-2",
    codice: "26-0002",
    macchina: "CAT 320",
    cliente: "Bianchi",
    targa: "XY999ZZ",
    matricola: "MAT-999",
    nScuderia: "",
    utilizzatore: "",
    cantiere: "",
    statoId: "accettazione",
    priorita: "media",
    addetto: "",
    noteInterne: "",
    dataIngresso: "2026-01-02",
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
  "lav-2": {
    lavorazioneId: "lav-2",
    ingresso: {
      tipo: "ingresso",
      createdAt: "2026-01-02",
      updatedAt: "2026-01-03T10:00:00.000Z",
      createdBy: "test",
      updatedBy: "test",
      sorgente: "generata",
      fileEsterno: null,
      campi: ingressoCampi({ targa: "XY999ZZ", matricola: "MAT-999", cliente: "Bianchi" }),
    },
    lavorazioni: null,
    ricambi: null,
  },
};

const hit = findActiveLavorazioneWithIngressoForCaptureIdent(
  ident,
  [] as MezzoGestito[],
  store,
  attive,
);
assert.equal(hit?.lavorazioneId, "lav-1");

const miss = findActiveLavorazioneWithIngressoForCaptureIdent(
  { targa: "ZZ999ZZ", matricola: "", nScuderia: "", vin: "", cliente: "" },
  [],
  store,
  attive,
);
assert.equal(miss, null);

// Stessa marca/modello in lista ma targa diversa in ingresso → nessun falso positivo
assert.equal(
  ingressoIdentMatchesCapture(ingressoCampi({ targa: "XY999ZZ", matricola: "MAT-999" }), {
    targa: "AB123CD",
    matricola: "",
    nScuderia: "",
    vin: "",
    cliente: "",
  }),
  false,
);

// VIN match
assert.equal(
  ingressoIdentMatchesCapture(ingressoCampi({ vin: "WDB12345678901234" }), {
    targa: "",
    matricola: "",
    nScuderia: "",
    vin: "WDB12345678901234",
    cliente: "",
  }),
  true,
);

// Conflitto targa+matricola
assert.equal(
  ingressoIdentMatchesCapture(ingressoCampi({ targa: "AB123CD", matricola: "MAT-A" }), {
    targa: "AB123CD",
    matricola: "MAT-B",
    nScuderia: "",
    vin: "",
    cliente: "",
  }),
  false,
);

const byScuderia = findActiveLavorazioneWithIngressoForCaptureIdent(
  { targa: "", matricola: "", nScuderia: "42", vin: "", cliente: "" },
  [],
  {
    "lav-s": {
      lavorazioneId: "lav-s",
      ingresso: {
        tipo: "ingresso",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02T10:00:00.000Z",
        createdBy: "test",
        updatedBy: "test",
        sorgente: "generata",
        fileEsterno: null,
        campi: ingressoCampi({ nScuderia: "42", cliente: "Scuderia" }),
      },
      lavorazioni: null,
      ricambi: null,
    },
  },
  [
    {
      id: "lav-s",
      codice: "26-0010",
      macchina: "Ferrari",
      cliente: "Scuderia",
      targa: "",
      matricola: "",
      nScuderia: "42",
      utilizzatore: "",
      cantiere: "",
      statoId: "accettazione",
      priorita: "media",
      addetto: "",
      noteInterne: "",
      dataIngresso: "2026-01-01",
      dataCompletamento: null,
    },
  ],
);
assert.equal(byScuderia?.lavorazioneId, "lav-s");

// Legacy ingresso senza campo vin → nessun crash
const legacyHit = findActiveLavorazioneWithIngressoForCaptureIdent(
  { targa: "AB123CD", matricola: "", nScuderia: "", vin: "", cliente: "" },
  [],
  {
    "lav-legacy": {
      lavorazioneId: "lav-legacy",
      ingresso: {
        tipo: "ingresso",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02T10:00:00.000Z",
        createdBy: "test",
        updatedBy: "test",
        sorgente: "generata",
        fileEsterno: null,
        campi: {
          ...ingressoCampi({ targa: "AB123CD" }),
          vin: undefined as unknown as string,
        },
      },
      lavorazioni: null,
      ricambi: null,
    },
  },
  [
    {
      id: "lav-legacy",
      codice: "26-0099",
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
      noteInterne: "",
      dataIngresso: "2026-01-01",
      dataCompletamento: null,
    },
  ],
);
assert.equal(legacyHit?.lavorazioneId, "lav-legacy");

console.log("capture-lavorazione-match.test.ts OK");
