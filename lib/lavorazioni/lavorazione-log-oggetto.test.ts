import assert from "node:assert/strict";
import {
  formatLavorazioneLogOggettoLabel,
  pickMezzoIdentPriority,
} from "@/lib/lavorazioni/lavorazione-log-oggetto";

assert.equal(pickMezzoIdentPriority({ scuderia: "42", targa: "AB123", matricola: "M1" }), "42");
assert.equal(pickMezzoIdentPriority({ targa: "AB123", matricola: "M1" }), "AB123");
assert.equal(pickMezzoIdentPriority({ matricola: "M1" }), "M1");
assert.equal(pickMezzoIdentPriority({ scuderia: "—", targa: "", matricola: "M1" }), "M1");

assert.equal(
  formatLavorazioneLogOggettoLabel({
    cliente: "Raccolgo",
    marca: "Coseco",
    modello: "K6",
    scuderia: "1653",
    targa: "GZ923GX",
    matricola: "NE296",
  }),
  "Raccolgo · Coseco K6 · 1653",
);

assert.equal(
  formatLavorazioneLogOggettoLabel({
    cliente: "Raccolgo",
    marca: "Coseco",
    modello: "K6",
    targa: "GZ923GX",
    matricola: "NE296",
  }),
  "Raccolgo · Coseco K6 · GZ923GX",
);

console.log("lavorazione-log-oggetto.test.ts OK");
