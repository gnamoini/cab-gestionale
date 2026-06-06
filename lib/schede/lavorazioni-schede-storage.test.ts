import assert from "node:assert/strict";
import {
  LAVORAZIONI_SCHEDE_STORAGE_MAX_ENTRIES,
  pruneLavorazioneSchedeStore,
  touchLavorazioneSchedeAccess,
} from "@/lib/schede/lavorazioni-schede-storage";
import type { LavorazioneSchedeStore } from "@/types/schede";

function emptyBundle(id: string) {
  return {
    lavorazioneId: id,
    codice: null,
    ingresso: null,
    lavorazioni: null,
    ricambi: null,
  };
}

const store: LavorazioneSchedeStore = Object.fromEntries(
  Array.from({ length: 200 }, (_, i) => [`lav-${i}`, emptyBundle(`lav-${i}`)]),
);

const order = Array.from({ length: 200 }, (_, i) => `lav-${i}`);
const pruned = pruneLavorazioneSchedeStore(store, order, LAVORAZIONI_SCHEDE_STORAGE_MAX_ENTRIES);

assert.equal(Object.keys(pruned.store).length, LAVORAZIONI_SCHEDE_STORAGE_MAX_ENTRIES);
assert.equal(pruned.accessOrder.length, LAVORAZIONI_SCHEDE_STORAGE_MAX_ENTRIES);
assert.ok(pruned.store["lav-199"]);
assert.equal(pruned.store["lav-0"], undefined);

const touched = touchLavorazioneSchedeAccess(["a", "b"], ["c"]);
assert.deepEqual(touched, ["a", "b", "c"]);

console.log("lavorazioni-schede-storage.test.ts OK");
