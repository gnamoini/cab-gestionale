import assert from "node:assert/strict";
import { sanitizeMezzoWritePayload } from "@/lib/validation/services/mezzi-payload";

const stripped = sanitizeMezzoWritePayload(
  {
    cliente: " ACME ",
    marca: "CAT",
    modello: "320",
    matricola: "M1",
    tipo_attrezzatura: "Escavatore",
  },
  { v2Enabled: true, source: "test" },
);

assert.equal(stripped.cliente, "ACME");
assert.equal("marca" in stripped, false);
assert.equal("modello" in stripped, false);
assert.equal("matricola" in stripped, false);
assert.equal("tipo_attrezzatura" in stripped, false);

const kept = sanitizeMezzoWritePayload(
  { cliente: "ACME", marca: "CAT" },
  { v2Enabled: false, source: "test-legacy-opt-out" },
);
assert.equal("marca" in kept, false);

console.log("mezzi-payload-v2-guard.test.ts OK");
