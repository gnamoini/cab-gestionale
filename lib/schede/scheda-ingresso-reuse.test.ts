import assert from "node:assert/strict";
import {
  hasSchedaIngressoIdentLookup,
  listSchedaIngressoMatchesForIdent,
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
  vin: "",
  targa: "AA111BB",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
    richiedenteTelefono: "",
});

assert.equal(hasSchedaIngressoIdentLookup("AA111BB", ""), true);
assert.equal(hasSchedaIngressoIdentLookup("", ""), false);
assert.equal(hasSchedaIngressoIdentLookup("", "", "42"), true);

const merged = mergeSchedaIngressoFields(
  { ...baseFields(), cliente: "Già inserito" },
  { ...baseFields(), cliente: "Da copia", marcaAttrezzatura: "Bobcat", dataIngresso: "10/10/2020" },
);
assert.equal(merged.cliente, "Già inserito");
assert.equal(merged.marcaAttrezzatura, "Bobcat");
assert.equal(merged.dataIngresso, "01/01/2026");

const FIRMA = "data:image/png;base64,abc";
const withCaptureFirme = mergeSchedaIngressoFields(
  baseFields(),
  { ...baseFields(), richiedenteFirma: FIRMA, addettoFirma: FIRMA },
);
assert.equal(withCaptureFirme.richiedenteFirma, undefined);
const fromCapture = mergeSchedaIngressoFields(
  baseFields(),
  { ...baseFields(), richiedenteFirma: FIRMA, addettoFirma: FIRMA },
  { copySignatures: true },
);
assert.equal(fromCapture.richiedenteFirma, FIRMA);
assert.equal(fromCapture.addettoFirma, FIRMA);

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
  "lav-scuderia": {
    lavorazioneId: "lav-scuderia",
    ingresso: {
      tipo: "ingresso" as const,
      sorgente: "generata" as const,
      createdAt: "2025-02-01T10:00:00.000Z",
      updatedAt: "2025-07-01T12:00:00.000Z",
      createdBy: "B",
      updatedBy: "B",
      fileEsterno: null,
      campi: { ...baseFields(), targa: "", matricola: "", nScuderia: "99", cliente: "Scuderia Srl" },
    },
    lavorazioni: null,
    ricambi: null,
  },
};

const attive = [
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
    note: "",
    priorita: "media",
    statoId: "accettazione",
    dataCompletamento: null,
  },
  {
    id: "lav-scuderia",
    targa: "",
    matricola: "",
    macchina: "Y",
    nScuderia: "99",
    dataIngresso: "2025-02-01",
    cliente: "—",
    cantiere: "",
    utilizzatore: "",
    addetto: "",
    note: "",
    priorita: "media",
    statoId: "accettazione",
    dataCompletamento: null,
  },
] as const;

const hit = listSchedaIngressoMatchesForIdent("AA111BB", "ABC123", "", [], store, [...attive], [], {
  excludeLavorazioneId: "lav-new",
})[0];

assert.ok(hit);
assert.equal(hit.campi.cliente, "Storico Srl");

const byScuderia = listSchedaIngressoMatchesForIdent("", "", "99", [], store, [...attive], [])[0];
assert.ok(byScuderia);
assert.equal(byScuderia.campi.cliente, "Scuderia Srl");

const duplicates = listSchedaIngressoMatchesForIdent("AA111BB", "ABC123", "99", [], store, [...attive], []);
assert.equal(duplicates.length, 2);
assert.equal(duplicates[0]!.sourceLavorazioneId, "lav-scuderia");

const fuzzyStore = {
  ...store,
  "lav-same-model": {
    lavorazioneId: "lav-same-model",
    ingresso: {
      tipo: "ingresso" as const,
      sorgente: "generata" as const,
      createdAt: "2025-03-01T10:00:00.000Z",
      updatedAt: "2025-08-01T12:00:00.000Z",
      createdBy: "C",
      updatedBy: "C",
      fileEsterno: null,
      campi: { ...baseFields(), targa: "ZZ999ZZ", matricola: "OTHER", cliente: "Altro" },
    },
    lavorazioni: null,
    ricambi: null,
  },
};

const strictOnly = listSchedaIngressoMatchesForIdent("AA111BB", "", "", [], fuzzyStore, [...attive], []);
assert.equal(strictOnly.length, 1);
assert.equal(strictOnly[0]!.sourceLavorazioneId, "lav-old");

console.log("scheda-ingresso-reuse.test.ts: ok");
