import assert from "node:assert/strict";
import {
  getScontoFornitoreMarca,
  registerMarcaInMagazzinoMaster,
  renameMarcaInMagazzinoMaster,
  setScontoFornitoreMarca,
} from "./marca-fornitore-sconto";

const empty = { marche: [], categorie: [], mezziCompatibili: [], fornitori: [] };

let mag = registerMarcaInMagazzinoMaster(empty, "AMS");
mag = setScontoFornitoreMarca(mag, "AMS", 12.5);
assert.equal(getScontoFornitoreMarca(mag, "ams"), 12.5);

mag = registerMarcaInMagazzinoMaster(empty, "AMS");
mag = setScontoFornitoreMarca(mag, "AMS", 20);
mag = renameMarcaInMagazzinoMaster(mag, "AMS", "AMS Pro");
assert.deepEqual(mag.marche, ["AMS Pro"]);
assert.equal(getScontoFornitoreMarca(mag, "AMS Pro"), 20);
assert.equal(getScontoFornitoreMarca(mag, "AMS"), 0);
