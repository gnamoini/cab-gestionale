import assert from "node:assert/strict";
import { computeLabelFingerprint } from "@/lib/inventory-labels/domain/fingerprints";
import { GENERATOR_VERSION } from "@/lib/inventory-labels/domain/types";

const base = {
  payload: {
    marca: "BOSCH",
    marcaSecondaria: "",
    descrizione: "Filtro olio",
    codice: "ABC123",
    codiceSecondario: "",
    fornitoreAlternativo: "",
    codiceAlternativo: "",
  },
  templateId: "50x30-default",
  templateVersion: "1.2.0",
  generatorVersion: GENERATOR_VERSION,
  preset: "50x30-default",
  canonicalOrigin: "https://cab-gestionale.vercel.app",
};

const h1 = computeLabelFingerprint(base);
const h2 = computeLabelFingerprint(base);
assert.equal(h1, h2);

const h3 = computeLabelFingerprint({
  ...base,
  payload: { ...base.payload, marca: "MANN" },
});
assert.notEqual(h1, h3);

const h4 = computeLabelFingerprint({
  ...base,
  canonicalOrigin: "https://staging.example.com",
});
assert.notEqual(h1, h4);

console.log("inventory-labels/domain/fingerprints.test.ts OK");
