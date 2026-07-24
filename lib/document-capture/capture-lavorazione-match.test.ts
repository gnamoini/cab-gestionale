import assert from "node:assert/strict";
import {
  findActiveLavorazioneWithIngressoForCaptureIdent,
  ingressoIdentMatchesCapture,
  resolveCaptureIdentFromFields,
  scoreCaptureLavorazioneCandidates,
} from "@/lib/document-capture/capture-lavorazione-match";
import { normalizeVehicleIdentifier } from "@/lib/schede/normalize-vehicle-identifier";
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
    note: "",
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
    note: "",
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
      note: "",
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
      note: "",
      dataIngresso: "2026-01-01",
      dataCompletamento: null,
    },
  ],
);
assert.equal(legacyHit?.lavorazioneId, "lav-legacy");

// Normalizzazione targa con spazi
assert.equal(normalizeVehicleIdentifier("targa", "AB 123 CD"), "AB123CD");
assert.equal(
  ingressoIdentMatchesCapture(ingressoCampi({ targa: "AB123CD" }), {
    targa: "AB 123 CD",
    matricola: "",
    nScuderia: "",
    vin: "",
    cliente: "",
  }),
  true,
);

// Priorità targa > matricola
const priorityAttive: LavorazioneAttiva[] = [
  {
    id: "lav-targa",
    codice: "26-0100",
    macchina: "A",
    cliente: "A",
    targa: "AA111AA",
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
  {
    id: "lav-mat",
    codice: "26-0101",
    macchina: "B",
    cliente: "B",
    targa: "",
    matricola: "MAT-ONLY",
    nScuderia: "",
    utilizzatore: "",
    cantiere: "",
    statoId: "accettazione",
    priorita: "media",
    addetto: "",
    note: "",
    dataIngresso: "2026-01-02",
    dataCompletamento: null,
  },
];
const priorityHit = findActiveLavorazioneWithIngressoForCaptureIdent(
  { targa: "AA111AA", matricola: "", nScuderia: "", vin: "", cliente: "" },
  [],
  {},
  priorityAttive,
);
assert.equal(priorityHit?.lavorazioneId, "lav-targa");

// Tie-break recency
const tieStore: LavorazioneSchedeStore = {
  "lav-old": {
    lavorazioneId: "lav-old",
    ingresso: {
      tipo: "ingresso",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01T10:00:00.000Z",
      createdBy: "test",
      updatedBy: "test",
      sorgente: "generata",
      fileEsterno: null,
      campi: ingressoCampi({ targa: "ZZ000ZZ" }),
    },
    lavorazioni: null,
    ricambi: null,
  },
  "lav-new": {
    lavorazioneId: "lav-new",
    ingresso: {
      tipo: "ingresso",
      createdAt: "2026-01-02",
      updatedAt: "2026-02-01T10:00:00.000Z",
      createdBy: "test",
      updatedBy: "test",
      sorgente: "generata",
      fileEsterno: null,
      campi: ingressoCampi({ targa: "ZZ000ZZ" }),
    },
    lavorazioni: null,
    ricambi: null,
  },
};
const tieHit = findActiveLavorazioneWithIngressoForCaptureIdent(
  { targa: "ZZ000ZZ", matricola: "", nScuderia: "", vin: "", cliente: "" },
  [],
  tieStore,
  [
    {
      id: "lav-old",
      codice: "26-0200",
      macchina: "X",
      cliente: "X",
      targa: "ZZ000ZZ",
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
    {
      id: "lav-new",
      codice: "26-0201",
      macchina: "Y",
      cliente: "Y",
      targa: "ZZ000ZZ",
      matricola: "",
      nScuderia: "",
      utilizzatore: "",
      cantiere: "",
      statoId: "accettazione",
      priorita: "media",
      addetto: "",
      note: "",
      dataIngresso: "2026-02-01",
      dataCompletamento: null,
    },
  ],
);
assert.equal(tieHit?.lavorazioneId, "lav-new");

// Fallback su dati lavorazione senza scheda ingresso in cache
const fallbackHit = findActiveLavorazioneWithIngressoForCaptureIdent(
  { targa: "FF555FF", matricola: "", nScuderia: "", vin: "", cliente: "" },
  [],
  {},
  [
    {
      id: "lav-fb",
      codice: "26-0300",
      macchina: "FB",
      cliente: "Cliente FB",
      targa: "FF555FF",
      matricola: "",
      nScuderia: "",
      utilizzatore: "",
      cantiere: "",
      statoId: "accettazione",
      priorita: "media",
      addetto: "",
      note: "",
      dataIngresso: "2026-01-05",
      dataCompletamento: null,
    },
  ],
);
assert.equal(fallbackHit?.lavorazioneId, "lav-fb");

const ranked = scoreCaptureLavorazioneCandidates(
  { targa: "FF555FF", matricola: "", nScuderia: "", vin: "", cliente: "" },
  [],
  {},
  [
    {
      id: "lav-fb",
      codice: "26-0300",
      macchina: "FB",
      cliente: "Cliente FB",
      targa: "FF555FF",
      matricola: "",
      nScuderia: "",
      utilizzatore: "",
      cantiere: "",
      statoId: "accettazione",
      priorita: "media",
      addetto: "",
      note: "",
      dataIngresso: "2026-01-05",
      dataCompletamento: null,
    },
  ],
);
assert.equal(ranked[0]?.source, "lavorazione");
assert.ok(ranked[0]?.score >= 100);

console.log("capture-lavorazione-match.test.ts OK");
