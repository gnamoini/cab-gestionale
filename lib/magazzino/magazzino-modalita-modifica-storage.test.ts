import assert from "node:assert/strict";
import {
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

assert.equal(readMagazzinoModalitaModifica(), false);
writeMagazzinoModalitaModifica(true);
assert.equal(readMagazzinoModalitaModifica(), true);
writeMagazzinoModalitaModifica(false);
assert.equal(readMagazzinoModalitaModifica(), false);

console.log("magazzino-modalita-modifica-storage.test.ts OK");
