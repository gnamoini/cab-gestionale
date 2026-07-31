import assert from "node:assert/strict";
import { test } from "node:test";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { buildNewPreventivoFromLavorazioneContext } from "@/lib/preventivi/generate-preventivo-from-lavorazione";
import { buildDescriptionInputFromBundle } from "@/lib/preventivi/description-engine/resolve-description-input";
import {
  resolveMezzoForPendingPreventivo,
  resolveMezzoForPreventivoHandoff,
} from "@/lib/preventivi/resolve-mezzo-for-pending-preventivo";
import type { PendingPreventivoPayload } from "@/lib/preventivi/preventivi-session-bridge";

const mezzi = [
  {
    id: "550e8400-e29b-41d4-a716-446655440099",
    cliente: "Impresa Edile Rossi S.p.A.",
    targa: "AE 123 BC",
    matricola: "CAT320D-001",
    numeroScuderia: "",
    marca: "CAT",
    modello: "320D",
    utilizzatore: "—",
    cantiere: "",
    tipoAttrezzatura: "Escavatore",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    oreKm: 0,
    km: 0,
    anno: 2020,
    statoAttuale: "attivo",
    dataUltimaUscita: "",
    note: "",
    priorita: "media",
  },
] as MezzoGestito[];

const lav = {
  id: "1c184692-0355-44fe-89ad-9f8f3232ef02",
  codice: "26-0218",
  macchina: "— —",
  targa: "—",
  matricola: "Escavatore cingolato CAT 320D - Targa: AE 123 BC",
  nScuderia: "",
  cliente: "Impresa Edile Rossi S.p.A.",
  utilizzatore: "—",
  cantiere: "",
  statoId: "accettazione",
  priorita: "media",
  addetto: "Mario B.",
  note: "",
  dataIngresso: "2026-07-11",
  dataCompletamento: null,
} as LavorazioneAttiva;

const bundle: PendingPreventivoPayload["bundle"] = {
  lavorazioneId: lav.id,
  ingresso: null,
  lavorazioni: {
    tipo: "lavorazioni",
    campi: {
      identificazioneMacchina: "Escavatore cingolato CAT 320D - Targa: AE 123 BC",
      righe: [],
    },
    sorgente: "generata",
    createdAt: "2026-07-11T00:00:00.000Z",
    createdBy: "x",
    updatedAt: "2026-07-11T00:00:00.000Z",
    updatedBy: "y",
    fileEsterno: null,
  },
  ricambi: null,
};

test("resolveMezzoForPendingPreventivo usa snapshot mezzo nel payload", () => {
  const pending: PendingPreventivoPayload = {
    lav,
    origine: "attiva",
    bundle,
    mezzo: mezzi[0],
    mezzoId: mezzi[0].id,
  };
  const hit = resolveMezzoForPendingPreventivo([], pending);
  assert.equal(hit?.id, mezzi[0].id);
});

test("resolveMezzoForPreventivoHandoff trova mezzo via ident canonical", () => {
  const hit = resolveMezzoForPreventivoHandoff(mezzi, {
    lav,
    ident: { targa: "AE 123 BC", matricola: "", nScuderia: "" },
  });
  assert.equal(hit?.id, mezzi[0].id);
});

test("resolveMezzoForPendingPreventivo usa ident nel payload", () => {
  const pending: PendingPreventivoPayload = {
    lav,
    origine: "attiva",
    bundle,
    ident: { targa: "AE 123 BC", matricola: "", nScuderia: "" },
  };
  const hit = resolveMezzoForPendingPreventivo(mezzi, pending);
  assert.equal(hit?.id, mezzi[0].id);
});

test("build con mezzo risolto imposta mezzoId sul record", async () => {
  const mezzo = mezzi[0];
  const rec = await buildNewPreventivoFromLavorazioneContext({
    lav,
    origine: "attiva",
    bundle,
    mezzo,
    magazzino: [],
    autore: "Test",
    existingRecords: [],
    descriptionDeps: {
      resolveInput: async () => buildDescriptionInputFromBundle(bundle),
      polish: async (input) => ({
        attempted: true,
        applied: true,
        fallback: false,
        text: input.description,
        cacheHit: false,
        durationMs: 1,
        model: "gemini-3.5-flash",
      }),
    },
  });
  assert.equal(rec.mezzoId, mezzo.id);
});

console.log("resolve-mezzo-for-pending-preventivo.test.ts OK");
