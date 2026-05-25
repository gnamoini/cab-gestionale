import assert from "node:assert/strict";
import {
  bundleKeyToDbTipo,
  dbTipoToBundleKey,
  normalizeSchedaTipoDb,
} from "./scheda-tipo-db-mapper";

assert.equal(bundleKeyToDbTipo("ingresso"), "ingresso");
assert.equal(bundleKeyToDbTipo("lavorazioni"), "interventi");
assert.equal(bundleKeyToDbTipo("ricambi"), "ricambi");

assert.equal(dbTipoToBundleKey("ingresso"), "ingresso");
assert.equal(dbTipoToBundleKey("interventi"), "lavorazioni");
assert.equal(dbTipoToBundleKey("ricambi"), "ricambi");

assert.equal(normalizeSchedaTipoDb("intervento"), "interventi");
assert.equal(dbTipoToBundleKey("intervento"), "lavorazioni");

assert.equal(normalizeSchedaTipoDb("unknown"), null);
assert.equal(dbTipoToBundleKey(""), null);

assert.equal(dbTipoToBundleKey("interventi"), "lavorazioni");

console.log("scheda-tipo-db-mapper.test.ts: ok");
