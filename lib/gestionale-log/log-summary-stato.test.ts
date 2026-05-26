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

const genericRefresh = buildLogModificaSummary({
  entita: "lavorazioni",
  entita_id: "lav-1",
  azione: "UPDATE",
  statiLavorazione: stati,
  payload: {
    context: { oggetto: "Cliente Demo — Bobcat E35" },
    before: { priorita: "media", note: "Prima" },
    after: { priorita: "alta", note: "Dopo" },
    summary: {
      tipoRiga: "AGGIORNAMENTO LAVORAZIONE",
      oggettoRiga: "Lavorazione",
      modifiche: ["Modifica registrata"],
    },
  },
});

assert.equal(genericRefresh.oggettoRiga, "Cliente Demo — Bobcat E35", "context oggetto must replace generic title");
assert.ok(
  genericRefresh.modifiche.some((m) => m.includes("Priorità")),
  "generic cached summary must refresh from payload diff",
);

const schedaAddetto = buildLogModificaSummary({
  entita: "scheda_lavorazione",
  entita_id: "sch-1",
  azione: "UPDATE",
  payload: {
    before: {
      lavorazione_id: "lav-9",
      contenuto: { doc: { campi: { addettoAccettazione: "Mario" } } },
    },
    after: {
      lavorazione_id: "lav-9",
      contenuto: { doc: { campi: { addettoAccettazione: "Luigi" } } },
    },
  },
});

assert.equal(
  schedaAddetto.modifiche[0],
  "Utente accettazione modificato da “Mario” a “Luigi”",
  "scheda contenuto diff must expand nested campi",
);

console.log("log-summary-stato.test.ts OK");
