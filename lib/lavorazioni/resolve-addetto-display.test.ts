import assert from "node:assert/strict";
import {
  resolveAddettoDisplayLabel,
  resolveAddettoNomeKey,
} from "@/lib/lavorazioni/resolve-addetto-display";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

const row = { id: "lav-1" } as Pick<LavorazioneListRow, "id">;
const records = [{ id: "v", nome: "Vito", cognome: "Polieri" }];
const schedeStore = {
  "lav-1": {
    ingresso: {
      campi: { addettoAccettazione: "Vito" },
    },
  },
} as unknown as LavorazioneSchedeStore;

{
  const ctx = { schedeStore, addettiRecords: records };
  assert.equal(resolveAddettoNomeKey(row, ctx), "Vito");
  assert.equal(resolveAddettoDisplayLabel(row, ctx), "Vito Polieri");
}

{
  const ctx = {
    schedeStore: {
      "lav-1": { ingresso: { campi: { addettoAccettazione: "Vito Polieri" } } },
    } as unknown as LavorazioneSchedeStore,
    addettiRecords: records,
  };
  assert.equal(resolveAddettoNomeKey(row, ctx), "Vito");
  assert.equal(resolveAddettoDisplayLabel(row, ctx), "Vito Polieri");
}

console.log("resolve-addetto-display.test.ts OK");
