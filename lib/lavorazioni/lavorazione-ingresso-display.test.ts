import assert from "node:assert/strict";
import {
  formatLavorazioneIngressoDisplay,
  lavorazioneIngressoIso,
} from "@/lib/lavorazioni/lavorazione-ingresso-display";

const row = {
  data_ingresso: "2026-07-21T10:00:00.000Z",
  created_at: "2026-07-21T12:00:00.000Z",
};

const fromSchedaIt = lavorazioneIngressoIso(row, "18/06/2024");
assert.equal(formatLavorazioneIngressoDisplay(fromSchedaIt).date, "18/06/2024");

const fromSchedaIso = lavorazioneIngressoIso(row, "2024-06-18T12:00:00.000Z");
assert.equal(formatLavorazioneIngressoDisplay(fromSchedaIso).date, "18/06/2024");

const fromRowOnly = lavorazioneIngressoIso(row, "");
assert.equal(formatLavorazioneIngressoDisplay(fromRowOnly).date, "21/07/2026");

console.log("lavorazione-ingresso-display.test.ts: ok");
