import assert from "node:assert/strict";
import { buildLogModificaSummary } from "@/lib/gestionale-log/log-summary";
import { statoLavorazioneLabel } from "@/lib/lavorazioni/stati-dynamic";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";

const stati: StatoLavorazioneConfig[] = [
  { id: "accettazione", label: "Accettazione", color: "#52525b" },
  { id: "custom_1", label: "In attesa preventivo", color: "#ea580c" },
  { id: "custom_2", label: "Attesa ricambi officina", color: "#7c3aed" },
];

assert.equal(
  statoLavorazioneLabel("Custom_1", stati),
  "In attesa preventivo",
  "Custom_1 (DB casing) must resolve to settings label",
);

assert.equal(
  statoLavorazioneLabel("Custom_2", stati),
  "Attesa ricambi officina",
  "Custom_2 (DB casing) must resolve to settings label",
);

const cachedSummary = buildLogModificaSummary({
  entita: "lavorazioni",
  entita_id: "lav-1",
  azione: "UPDATE",
  statiLavorazione: stati,
  payload: {
    summary: {
      tipoRiga: "AGGIORNAMENTO LAVORAZIONE",
      oggettoRiga: "Cliente — Mezzo",
      modifiche: ['Stato modificato da "Custom_2" a "Custom_1"'],
    },
  },
});

assert.equal(
  cachedSummary.modifiche[0],
  "Stato modificato da “Attesa ricambi officina” a “In attesa preventivo”",
  "persisted summary must remap stato ids from text when payload has no diff",
);

const payloadDiff = buildLogModificaSummary({
  entita: "lavorazioni",
  entita_id: "lav-1",
  azione: "UPDATE",
  statiLavorazione: stati,
  payload: {
    before: { stato: "Custom_2" },
    after: { stato: "custom_1" },
    summary: {
      tipoRiga: "AGGIORNAMENTO LAVORAZIONE",
      oggettoRiga: "Cliente — Mezzo",
      modifiche: ['Stato modificato da "Custom_2" a "Custom_1"'],
    },
  },
});

assert.equal(
  payloadDiff.modifiche[0],
  "Stato modificato da “Attesa ricambi officina” a “In attesa preventivo”",
  "payload diff must prefer before/after with remapped labels",
);

console.log("log-summary-stato.test.ts OK");
