import assert from "node:assert/strict";
import { mergeSchedeStores } from "./schede-db-mapper";
import { isSchedeDbPrimary } from "./schede-db-primary";
import type { LavorazioneSchedeStore } from "@/types/schede";

function noteFor(store: LavorazioneSchedeStore, lavId: string): string {
  const ingresso = store[lavId]?.ingresso;
  if (!ingresso || typeof ingresso !== "object") return "";
  const campi = (ingresso as { campi?: { noteIntervento?: string } }).campi;
  return campi?.noteIntervento ?? "";
}

const local = {
  "lav-a": {
    lavorazioneId: "lav-a",
    ingresso: { campi: { noteIntervento: "nota locale" } },
    lavorazioni: null,
    ricambi: null,
  },
} as unknown as LavorazioneSchedeStore;

const remote = {
  "lav-a": {
    lavorazioneId: "lav-a",
    ingresso: { campi: { noteIntervento: "nota remota" } },
    lavorazioni: null,
    ricambi: null,
  },
  "lav-b": {
    lavorazioneId: "lav-b",
    ingresso: { campi: { noteIntervento: "solo remoto" } },
    lavorazioni: null,
    ricambi: null,
  },
} as unknown as LavorazioneSchedeStore;

assert.equal(isSchedeDbPrimary(), process.env.NEXT_PUBLIC_SCHEDE_LOCAL_PRIMARY !== "true");

const dbPrimary = mergeSchedeStores(local, remote, true);
assert.equal(noteFor(dbPrimary, "lav-a"), "nota remota");
assert.equal(noteFor(dbPrimary, "lav-b"), "solo remoto");

const localWins = mergeSchedeStores(local, remote, false);
assert.equal(noteFor(localWins, "lav-a"), "nota locale");
assert.equal(noteFor(localWins, "lav-b"), "solo remoto");

console.log("schede-sync.test.ts OK");
