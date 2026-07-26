import assert from "node:assert/strict";
import { addettoDisplayColorById } from "@/lib/lavorazioni/addetto-colors-assign";

const records = [{ id: "id-mario", nome: "Mario", cognome: "Rossi", colorKey: "id-mario" }];
const map = { "id-mario": "#2563eb" };

// lookup diretto per id
assert.equal(addettoDisplayColorById("id-mario", map, records), "#2563eb");

// lookup per nome legacy con mappa id-keyed
assert.equal(addettoDisplayColorById("Mario", map, records), "#2563eb");

// ghost value tabella (nome come value) risolve al colore impostazioni
assert.equal(addettoDisplayColorById("Mario", map, records), map["id-mario"]);

console.log("addetto-colors-assign.test.ts OK");
