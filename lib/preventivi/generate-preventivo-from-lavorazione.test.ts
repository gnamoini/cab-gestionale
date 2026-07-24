import assert from "node:assert/strict";
import { test } from "node:test";
import { buildNewPreventivoFromLavorazioneContext } from "@/lib/preventivi/generate-preventivo-from-lavorazione";
import { buildDescriptionInputFromBundle } from "@/lib/preventivi/description-engine/resolve-description-input";
import { generatePreventivoDescriptionAsync } from "@/lib/preventivi/description-engine/generate-preventivo-description-async";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneSchedeBundle } from "@/types/schede";

const lav = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  codice: "LAV-001",
  cliente: "Cliente Test Srl",
  utilizzatore: "Util Test",
  cantiere: "Cantiere A",
  targa: "AB123CD",
  matricola: "MAT-99",
  nScuderia: "SC-1",
  macchina: "CAT 320",
  dataIngresso: "2026-01-15",
  dataCompletamento: "",
  noteInterne: "Nota lav",
  addetto: "Mario",
  statoId: "in_lavorazione",
  priorita: "media",
  mezzoId: "550e8400-e29b-41d4-a716-446655440002",
} as LavorazioneAttiva;

const mezzo = {
  id: "550e8400-e29b-41d4-a716-446655440002",
  cliente: "Cliente Test Srl",
  utilizzatore: "Util Mezzo",
  cantiere: "Cantiere Mezzo",
  marca: "CAT",
  modello: "320",
  targa: "AB123CD",
  matricola: "MAT-99",
  numeroScuderia: "SC-1",
  tipoAttrezzatura: "Escavatore",
  tipoTelaio: "Gomma",
  marcaTelaio: "Iveco",
  modelloTelaio: "Daily",
  oreKm: 1200,
  km: 45000,
  anno: 2020,
  statoAttuale: "attivo",
  dataUltimaUscita: "",
  note: "",
  priorita: "media",
} as MezzoGestito;

const bundleWithLavorazioni: LavorazioneSchedeBundle = {
  lavorazioneId: lav.id,
  ingresso: null,
  lavorazioni: {
    tipo: "lavorazioni",
    sorgente: "generata",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    createdBy: "Test",
    updatedBy: "Test",
    fileEsterno: null,
    campi: {
      identificazioneMacchina: "",
      righe: [
        {
          id: "r1",
          dataLavorazione: "2026-01-01",
          lavorazioniEffettuate: "Smontaggio pompa",
          addettiAssegnati: [],
        },
      ],
    },
  },
  ricambi: null,
};

const descriptionDeps = {
  resolveInput: async () => buildDescriptionInputFromBundle(bundleWithLavorazioni),
  polish: async (input: { description: string }) => ({
    attempted: true as const,
    applied: true,
    fallback: false,
    text: input.description,
    reason: "applied" as const,
    cacheHit: false,
    durationMs: 1,
    model: "gemini-3.5-flash",
  }),
};

test("buildNewPreventivoFromLavorazioneContext usa mezzo quando ingresso assente", async () => {
  const rec = await buildNewPreventivoFromLavorazioneContext({
    lav,
    origine: "attiva",
    bundle: bundleWithLavorazioni,
    mezzo,
    magazzino: [],
    autore: "Test",
    existingRecords: [],
    descriptionDeps,
  });
  assert.equal(rec.cliente, "Cliente Test Srl");
  assert.equal(rec.targa, "AB123CD");
  assert.equal(rec.marcaAttrezzatura, "CAT");
  assert.equal(rec.modelloAttrezzatura, "320");
  assert.equal(rec.lavorazioneId, lav.id);
  assert.ok(rec.id.length > 0);
});

test("buildNewPreventivoFromLavorazioneContext id è uuid valido", async () => {
  const rec = await buildNewPreventivoFromLavorazioneContext({
    lav,
    origine: "attiva",
    bundle: bundleWithLavorazioni,
    mezzo,
    magazzino: [],
    autore: "Test",
    existingRecords: [],
    descriptionDeps,
  });
  assert.match(rec.id, /^[0-9a-f-]{36}$/i);
  assert.match(rec.descriptionGenerationId ?? "", /^[0-9a-f-]{36}$/i);
  assert.equal(rec.descriptionEngineMeta?.engineVersion, "tde_v1");
  assert.equal(rec.descriptionEngineMeta?.polish?.attempted, true);
});

test("generatePreventivoDescriptionAsync richiede polish tentato", async () => {
  let polishCalled = false;
  const out = await generatePreventivoDescriptionAsync({
    lavorazioneId: lav.id,
    ctx: { cliente: "", targa: "", matricola: "", existingPreventiviRecords: [] },
    deps: {
      resolveInput: async () => buildDescriptionInputFromBundle(bundleWithLavorazioni),
      polish: async (input) => {
        polishCalled = true;
        return {
          attempted: true,
          applied: true,
          fallback: false,
          text: input.description,
          reason: "applied",
          cacheHit: false,
          durationMs: 1,
          model: "gemini-3.5-flash",
        };
      },
    },
  });
  assert.equal(polishCalled, true);
  assert.equal(out.polish.attempted, true);
  assert.ok(out.description.includes("Smontaggio pompa"));
});

console.log("generate-preventivo-from-lavorazione.test.ts OK");
