import assert from "node:assert/strict";
import {
  MAGAZZINO_MODALITA_MODIFICA_KEY,
  MAGAZZINO_MODALITA_MODIFICA_VERSION_KEY,
  migrateMagazzinoModalitaModificaPreferenceV2,
  readMagazzinoModalitaModifica,
  writeMagazzinoModalitaModifica,
} from "@/lib/magazzino/magazzino-modalita-modifica-storage";

const g = globalThis as typeof globalThis & { localStorage?: Storage; window?: Window };
const store = new Map<string, string>();
g.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => {
    store.set(k, v);
  },
  removeItem: (k) => {
    store.delete(k);
  },
  clear: () => store.clear(),
  key: () => null,
  length: 0,
};
g.window = g as unknown as Window & typeof globalThis;

store.clear();
assert.equal(readMagazzinoModalitaModifica(), true, "missing key defaults ON");

store.clear();
writeMagazzinoModalitaModifica(true);
assert.equal(readMagazzinoModalitaModifica(), true);
writeMagazzinoModalitaModifica(false);
assert.equal(readMagazzinoModalitaModifica(), false);

store.clear();
store.set(MAGAZZINO_MODALITA_MODIFICA_KEY, "0");
assert.equal(readMagazzinoModalitaModifica(), false);
migrateMagazzinoModalitaModificaPreferenceV2();
assert.equal(readMagazzinoModalitaModifica(), true, "v1 OFF migrates to ON");
assert.equal(store.get(MAGAZZINO_MODALITA_MODIFICA_VERSION_KEY), "2");

store.clear();
migrateMagazzinoModalitaModificaPreferenceV2();
writeMagazzinoModalitaModifica(false);
migrateMagazzinoModalitaModificaPreferenceV2();
assert.equal(readMagazzinoModalitaModifica(), false, "post-v2 user OFF preserved");

console.log("magazzino-modalita-modifica-storage.test.ts OK");
