import assert from "node:assert/strict";
import {
  getScontoFornitoreAlternativo,
  registerFornitoreInMagazzinoMaster,
  renameFornitoreInMagazzinoMaster,
  setScontoFornitoreAlternativo,
} from "./fornitore-alternativo-sconto";

const empty = { marche: [], categorie: [], mezziCompatibili: [], fornitori: [], produttori: [] };

let mag = registerFornitoreInMagazzinoMaster(empty, "ACME");
mag = setScontoFornitoreAlternativo(mag, "ACME", 8.5);
assert.equal(getScontoFornitoreAlternativo(mag, "acme"), 8.5);

mag = registerFornitoreInMagazzinoMaster(empty, "ACME");
mag = setScontoFornitoreAlternativo(mag, "ACME", 15);
mag = renameFornitoreInMagazzinoMaster(mag, "ACME", "ACME Sud");
assert.deepEqual(mag.fornitori, ["ACME Sud"]);
assert.equal(getScontoFornitoreAlternativo(mag, "ACME Sud"), 15);
assert.equal(getScontoFornitoreAlternativo(mag, "ACME"), 0);
