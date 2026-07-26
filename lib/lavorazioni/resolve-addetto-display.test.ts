import assert from "node:assert/strict";
import {
  isLavorazioneAddettoUnassigned,
  resolveAddettoDisplayLabel,
  resolveAddettoNomeKey,
} from "@/lib/lavorazioni/resolve-addetto-display";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

const row = { id: "lav-1" } as Pick<LavorazioneListRow, "id">;
const records = [{ id: "v", nome: "Vito", cognome: "Polieri", colorKey: "v" }];
const schedeStore = {
  "lav-1": {
    ingresso: {
      campi: { addettoAccettazione: "Vito" },
    },
  },
} as unknown as LavorazioneSchedeStore;

{
  const ctx = { schedeStore, addettiRecords: records };
  assert.equal(resolveAddettoNomeKey(row, ctx), "v", "color key = record id");
  assert.equal(resolveAddettoDisplayLabel(row, ctx), "Vito Polieri");
}

{
  const ctx = {
    schedeStore: {
      "lav-1": {
        ingresso: {
          campi: { addettoAccettazioneId: "v", addettoAccettazione: "" },
        },
      },
    } as unknown as LavorazioneSchedeStore,
    addettiRecords: records,
  };
  assert.equal(resolveAddettoNomeKey(row, ctx), "v");
  assert.equal(resolveAddettoDisplayLabel(row, ctx), "Vito Polieri");
}

{
  assert.equal(isLavorazioneAddettoUnassigned(row, { schedeStore: {} }), false);
  const emptyIngresso = {
    "lav-1": { ingresso: { campi: { addettoAccettazione: "" } } },
  } as unknown as LavorazioneSchedeStore;
  assert.equal(isLavorazioneAddettoUnassigned(row, { schedeStore: emptyIngresso }), true);
  const defaultAddetto = {
    "lav-1": { ingresso: { campi: { addettoAccettazione: "Mario" } } },
  } as unknown as LavorazioneSchedeStore;
  assert.equal(isLavorazioneAddettoUnassigned(row, { schedeStore: defaultAddetto }), false);
}

console.log("resolve-addetto-display.test.ts OK");
