import assert from "node:assert/strict";
import { logModificaDetailLine } from "@/lib/gestionale-log/log-modifiche-view-model";
import { buildLogModificaSummary, sanitizeLogOggettoRiga } from "@/lib/gestionale-log/log-summary";
import { statoLavorazioneLabel } from "@/lib/lavorazioni/stati-dynamic";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LogModificaRow } from "@/src/types/supabase-tables";

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
  "Addetto accettazione modificato da “Mario” a “Luigi”",
  "scheda contenuto diff must expand nested campi",
);

assert.equal(
  sanitizeLogOggettoRiga("— — Connettori con Luce a Led"),
  "Connettori con Luce a Led",
  "placeholder dashes must be stripped from oggetto label",
);

const magPlaceholder = buildLogModificaSummary({
  entita: "magazzino_ricambi",
  entita_id: "ric-1",
  azione: "UPDATE",
  payload: {
    summary: {
      tipoRiga: "AGGIORNAMENTO RICAMBIO",
      oggettoRiga: "— — Connettori con Luce a Led",
      modifiche: ["Modifica registrata"],
    },
  },
});
assert.equal(
  magPlaceholder.oggettoRiga,
  "Connettori con Luce a Led",
  "cached summary oggetto must drop placeholder dashes",
);

const addettoLog = buildLogModificaSummary({
  entita: "lavorazioni",
  entita_id: "lav-addetto",
  azione: "UPDATE",
  payload: {
    before: { addetto: "Angelo" },
    after: { addetto: "Donato" },
    context: { oggetto: "Acme Spa — Bobcat E35" },
  },
});

assert.equal(addettoLog.oggettoRiga, "Acme Spa — Bobcat E35", "addetto log must show lavorazione label from context");

const cachedAddetto = buildLogModificaSummary({
  entita: "lavorazioni",
  entita_id: "lav-addetto",
  azione: "UPDATE",
  payload: {
    before: { addetto: "Angelo" },
    after: { addetto: "Donato" },
    context: { oggetto: "Acme Spa — Bobcat E35" },
    summary: {
      tipoRiga: "AGGIORNAMENTO LAVORAZIONE",
      oggettoRiga: "Lavorazione",
      modifiche: ["Addetto modificato da “Angelo” a “Donato”"],
    },
  },
});

assert.equal(cachedAddetto.oggettoRiga, "Acme Spa — Bobcat E35", "cached addetto log must refresh oggetto from context");

const schedaOggetto = buildLogModificaSummary({
  entita: "scheda_lavorazione",
  entita_id: "sch-2",
  azione: "UPDATE",
  payload: {
    before: {
      tipo: "ingresso",
      contenuto: { doc: { campi: { cliente: "Rossi Srl", marcaAttrezzatura: "FIAT", modelloAttrezzatura: "500" } } },
    },
    after: {
      tipo: "ingresso",
      contenuto: { doc: { campi: { cliente: "Rossi Srl", marcaAttrezzatura: "FIAT", modelloAttrezzatura: "500X" } } },
    },
  },
});

assert.equal(schedaOggetto.oggettoRiga, "Rossi Srl — FIAT 500X", "scheda log must identify cliente and attrezzatura");

const securityRow = {
  id: "log-1",
  entita: "lavorazioni",
  entita_id: "lav-1",
  azione: "UPDATE",
  created_at: "2026-06-05T10:00:00.000Z",
  payload: {
    before: { stato: "Custom_2" },
    after: { stato: "completata" },
    compact: '• Stato modificato da "Custom_2" a "Completata"',
  },
} as LogModificaRow;

const securityDetail = logModificaDetailLine(securityRow, stati);
assert.ok(
  securityDetail.includes("Attesa ricambi officina") && securityDetail.includes("Completata"),
  `security detail must remap stato ids, got: ${securityDetail}`,
);

console.log("log-summary-stato.test.ts OK");
