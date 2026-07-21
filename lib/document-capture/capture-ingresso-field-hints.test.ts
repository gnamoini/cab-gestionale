import assert from "node:assert/strict";
import {
  captureFieldValuesEquivalent,
  countCaptureHintsNeedingReview,
  isCaptureAmbiguousHintResolved,
  reconcileCaptureIngressoHintAfterEdit,
} from "@/lib/document-capture/capture-ingresso-field-hints";

assert.equal(countCaptureHintsNeedingReview({}), 0);
assert.equal(
  countCaptureHintsNeedingReview({
    cliente: { tone: "ok" },
    targa: { tone: "suggested", suggestion: "AB123CD" },
  }),
  1,
);
assert.equal(
  countCaptureHintsNeedingReview({
    cliente: { tone: "ambiguous", candidates: [] },
    targa: { tone: "catalog", message: "Non in anagrafica" },
  }),
  2,
);

const catalogInput = {
  fields: [],
  addettiRecords: [],
  mezziListe: { clienti: [], utilizzatori: [], cantieri: [], marche: [], modelli: ["5000"], tipiAttrezzatura: [], stati: [], tipiTelaio: [], telai: [] },
  magazzino: [],
};

const cleared = reconcileCaptureIngressoHintAfterEdit(
  "modelloAttrezzatura",
  "5000",
  { tone: "catalog", message: "Modello attrezzatura non presente nelle impostazioni del gestionale", captureFieldKey: "modello_attrezzatura" },
  catalogInput,
);
assert.equal(cleared, undefined);

const stillBad = reconcileCaptureIngressoHintAfterEdit(
  "modelloAttrezzatura",
  "CityCat 5000",
  { tone: "catalog", message: "Modello attrezzatura non presente nelle impostazioni del gestionale", captureFieldKey: "modello_attrezzatura" },
  catalogInput,
);
assert.equal(stillBad?.tone, "catalog");

assert.equal(captureFieldValuesEquivalent("SI.ECO", "Si.eco"), true);
assert.equal(captureFieldValuesEquivalent("SI.ECO", "SIECO"), true);
assert.equal(captureFieldValuesEquivalent("SI.ECO", "Altro cliente"), false);

const clearedCliente = reconcileCaptureIngressoHintAfterEdit(
  "cliente",
  "SI.ECO",
  { tone: "suggested", suggestion: "Si.eco", rawOcr: "SIECO SPA" },
  catalogInput,
);
assert.equal(clearedCliente, undefined);

const ambiguousHint = {
  tone: "ambiguous" as const,
  rawOcr: "MARIO",
  captureFieldKey: "cliente",
  candidates: [
    { id: "1", label: "Mario Rossi" },
    { id: "2", label: "Mario Bianchi" },
  ],
};

assert.equal(isCaptureAmbiguousHintResolved("cliente", "Mario Rossi", ambiguousHint), true);
assert.equal(isCaptureAmbiguousHintResolved("cliente", "Mario Verdi", ambiguousHint), true);
assert.equal(isCaptureAmbiguousHintResolved("cliente", "MARIO", ambiguousHint), false);

console.log("capture-ingresso-field-hints.test.ts OK");
