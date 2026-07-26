import assert from "node:assert/strict";
import { buildSyntheticTagliandoHistoryViews } from "@/lib/maintenance-plans/synthesize-tagliando-lavorazioni";

const views = buildSyntheticTagliandoHistoryViews({
  lavorazioni: [
    {
      id: "lav-1",
      stato: "completata",
      archived: false,
      data_uscita: "2026-03-12",
      data_ingresso: "2026-03-10",
      tagliando_preset_ref: "plan-a",
    },
  ],
  ingressiByLavorazioneId: new Map([
    ["lav-1", { lavorazioneId: "lav-1", oreLavoro: 1200, km: 73000 }],
  ]),
  registeredLavorazioneIds: new Set(),
  activePresetIds: ["plan-a"],
  planNames: new Map([["plan-a", "Tagliando motore"]]),
});

assert.equal(views.length, 1);
assert.equal(views[0]?.oreAtService, 73000);
assert.equal(views[0]?.kmAtService, 73000);
assert.equal(views[0]?.synthetic, true);
assert.equal(views[0]?.lavorazioneId, "lav-1");

console.log("synthesize-tagliando-lavorazioni.test.ts OK");
