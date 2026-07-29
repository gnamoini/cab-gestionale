import assert from "node:assert/strict";
import { mergeCaptureIngressoWithLinkedMezzo } from "@/lib/document-capture/merge-capture-ingresso-with-linked-mezzo";
import { applyCaptureConflictResolutions } from "@/lib/document-capture/apply-capture-conflict-resolutions";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

const mezzo: MezzoGestito = {
  id: "m-1",
  cliente: "Rossi",
  utilizzatore: "",
  marca: "CAT",
  modello: "320",
  targa: "AB123CD",
  matricola: "",
  tipoAttrezzatura: "Escavatore",
  anno: 2019,
  oreKm: 50,
  statoAttuale: "attivo",
  dataUltimaUscita: "",
  note: "",
  priorita: "normale",
};

const scanned = {
  dataIngresso: "01/02/2026",
  cliente: "Rossi",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "Escavatore",
  marcaAttrezzatura: "CAT",
  modelloAttrezzatura: "320",
  matricola: "NEW-MAT",
  nScuderia: "",
  oreLavoro: "100",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  vin: "",
  targa: "AB123CD",
  km: "",
  descrizioneAnomalia: "Perdita olio",
  livelloCarburante: "",
  addettoAccettazione: "Mario",
  richiedente: "",
  richiedenteTelefono: "",
} satisfies SchedaIngressoFields;

const merged = mergeCaptureIngressoWithLinkedMezzo({ scannedFields: scanned, linkedMezzo: mezzo });
assert.equal(merged.fields.descrizioneAnomalia, "Perdita olio");
assert.equal(merged.fields.targa, "AB123CD");
assert.equal(merged.missingFromRegistry.length, 1);
assert.equal(merged.missingFromRegistry[0]!.field, "matricola");

const conflictScanned = { ...scanned, targa: "AB999CD" };
const conflicted = mergeCaptureIngressoWithLinkedMezzo({
  scannedFields: conflictScanned,
  linkedMezzo: mezzo,
});
assert.equal(conflicted.conflicts.length, 1);
assert.equal(conflicted.conflicts[0]!.severity, "strong_identity");

const applied = applyCaptureConflictResolutions({
  mergeResult: conflicted,
  conflictResolutions: { targa: "scan" },
});
assert.equal(applied.targa, "AB999CD");

console.log("merge-capture-ingresso-with-linked-mezzo.test.ts OK");
