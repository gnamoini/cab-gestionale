import assert from "node:assert/strict";
import { computeLabelFingerprint } from "@/lib/inventory-labels/domain/fingerprints";

const base = {
  payload: {
    marca: "BOSCH",
    marcaSecondaria: "",
    descrizione: "Filtro",
    codice: "ABC",
    codiceSecondario: "",
    fornitoreAlternativo: "",
    codiceAlternativo: "",
    fornitoriAlternativi: [],
  },
  templateId: "60x40-default",
  templateVersion: "1",
  generatorVersion: "1",
  preset: "60x40-default",
  labelKind: "internal" as const,
  canonicalOrigin: "https://app.test",
};

const h1 = computeLabelFingerprint({ ...base, qrToken: "TOKEN-A" });
const h2 = computeLabelFingerprint({ ...base, qrToken: "TOKEN-B" });
assert.notEqual(h1, h2, "qrToken must change fingerprint (IL-016)");

console.log("fingerprints-qr-token.test.ts ok");
