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
    fornitoriAlternativi: [],
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

const hCliente = computeLabelFingerprint({
  ...base,
  labelKind: "cliente",
  clienteQrUrl: "https://www.autocompattatori.it",
});
assert.notEqual(h1, hCliente);

const h5 = computeLabelFingerprint({
  ...base,
  labelKind: "cliente",
  clienteQrUrl: "https://www.other.example",
});
assert.notEqual(hCliente, h5);

console.log("inventory-labels/domain/fingerprints.test.ts OK");
