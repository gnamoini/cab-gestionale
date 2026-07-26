import assert from "node:assert/strict";
import {
  captureSchedaTipoLabel,
  lavorazioneHasExistingScheda,
} from "@/lib/document-capture/capture-existing-scheda-presence";
import type { LavorazioneSchedeStore, SchedaIngressoDoc, SchedaLavorazioniDoc } from "@/types/schede";

const meta = {
  createdAt: "",
  updatedAt: "",
  createdBy: "",
  updatedBy: "",
  sorgente: "generata" as const,
  fileEsterno: null,
};

const store: LavorazioneSchedeStore = {
  "lav-1": {
    lavorazioneId: "lav-1",
    ingresso: { ...meta, tipo: "ingresso", campi: {} as SchedaIngressoDoc["campi"] },
    lavorazioni: null,
    ricambi: null,
  },
  "lav-2": {
    lavorazioneId: "lav-2",
    ingresso: null,
    lavorazioni: { ...meta, tipo: "lavorazioni", campi: {} as SchedaLavorazioniDoc["campi"] },
    ricambi: null,
  },
};

assert.equal(captureSchedaTipoLabel("ingresso"), "Scheda Ingresso");
assert.equal(lavorazioneHasExistingScheda(store, "lav-1", "ingresso"), true);
assert.equal(lavorazioneHasExistingScheda(store, "lav-1", "lavorazioni"), false);
assert.equal(lavorazioneHasExistingScheda(store, "lav-2", "lavorazioni"), true);
assert.equal(lavorazioneHasExistingScheda(store, "lav-2", "ricambi"), false);
assert.equal(lavorazioneHasExistingScheda(store, "", "ingresso"), false);

console.log("capture-existing-scheda-presence.test.ts OK");
