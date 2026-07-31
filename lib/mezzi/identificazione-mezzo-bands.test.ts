import assert from "node:assert/strict";
import { formatIdentificazioneMezzoBands } from "@/lib/mezzi/identificazione-mezzo";

const bands = formatIdentificazioneMezzoBands({
  cliente: "Recuperi Pugliesi",
  cantiere: "Modugno",
  utilizzatore: "Mario Rossi",
  marcaAttrezzatura: "Nextra",
  modelloAttrezzatura: "K-MD24T",
  matricola: "386/213",
  marcaTelaio: "Iveco",
  modelloTelaio: "Daily",
  targa: "ET897CD",
  vin: "VF123",
});

assert.equal(bands.length, 3);
assert.equal(bands[0]!.id, "cliente");
assert.equal(bands[0]!.line, "Recuperi Pugliesi · Modugno · Mario Rossi");
assert.equal(bands[1]!.id, "attrezzatura");
assert.equal(bands[1]!.line, "Nextra · K-MD24T · 386/213");
assert.equal(bands[2]!.id, "telaio");
assert.equal(bands[2]!.line, "Iveco · Daily · ET897CD · VF123");

assert.deepEqual(formatIdentificazioneMezzoBands({ cliente: "X", utilizzatore: "—" }), [
  { id: "cliente", line: "X" },
]);

assert.deepEqual(formatIdentificazioneMezzoBands({}), []);

console.log("identificazione-mezzo-bands.test.ts OK");
