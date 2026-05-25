import assert from "node:assert/strict";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";

assert.equal(lavorazioneDisplayCodice({ codice: "26-0001", id: "uuid-abc" }), "26-0001");
assert.equal(lavorazioneDisplayCodice({ codice: "  26-0042  ", id: "uuid-abc" }), "26-0042");
assert.equal(lavorazioneDisplayCodice({ codice: "", id: "lav-201" }), "LAV-201");
assert.equal(
  lavorazioneDisplayCodice({ codice: null, id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }),
  "#A1B2C3D4",
);

console.log("lavorazione-codice.test.ts OK");
