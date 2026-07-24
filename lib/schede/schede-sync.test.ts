import assert from "node:assert/strict";
import { mergeSchedeStores } from "./schede-db-mapper";
import { isSchedeDbPrimary } from "./schede-db-primary";
import type { LavorazioneSchedeStore } from "@/types/schede";

function anomaliaFor(store: LavorazioneSchedeStore, lavId: string): string {
  const ingresso = store[lavId]?.ingresso;
  if (!ingresso || typeof ingresso !== "object") return "";
  const campi = (ingresso as { campi?: { descrizioneAnomalia?: string } }).campi;
  return campi?.descrizioneAnomalia ?? "";
}

const local = {
  "lav-a": {
    lavorazioneId: "lav-a",
    ingresso: { campi: { descrizioneAnomalia: "anomalia locale" } },
    lavorazioni: null,
    ricambi: null,
  },
} as unknown as LavorazioneSchedeStore;

const remote = {
  "lav-a": {
    lavorazioneId: "lav-a",
    ingresso: { campi: { descrizioneAnomalia: "anomalia remota" } },
    lavorazioni: null,
    ricambi: null,
  },
  "lav-b": {
    lavorazioneId: "lav-b",
    ingresso: { campi: { descrizioneAnomalia: "solo remoto" } },
    lavorazioni: null,
    ricambi: null,
  },
} as unknown as LavorazioneSchedeStore;

assert.equal(isSchedeDbPrimary(), process.env.NEXT_PUBLIC_SCHEDE_LOCAL_PRIMARY !== "true");

const dbPrimary = mergeSchedeStores(local, remote, true);
assert.equal(anomaliaFor(dbPrimary, "lav-a"), "anomalia remota");
assert.equal(anomaliaFor(dbPrimary, "lav-b"), "solo remoto");

const localWins = mergeSchedeStores(local, remote, false);
assert.equal(anomaliaFor(localWins, "lav-a"), "anomalia locale");
assert.equal(anomaliaFor(localWins, "lav-b"), "solo remoto");

console.log("schede-sync.test.ts OK");
