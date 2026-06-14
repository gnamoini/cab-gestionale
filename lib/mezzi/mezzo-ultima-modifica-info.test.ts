import assert from "node:assert/strict";
import {
  buildUltimaModificaByMezzoIdFromLogs,
  formatMezzoUltimaModificaTooltip,
  resolveMezzoUltimaModificaInfo,
} from "@/lib/mezzi/mezzo-ultima-modifica-info";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LogModificaWithProfileRow } from "@/src/types/supabase-tables";

function sampleMezzo(overrides: Partial<MezzoGestito> = {}): MezzoGestito {
  return {
    id: "m-1",
    cliente: "Cliente",
    utilizzatore: "—",
    marca: "Marca",
    modello: "Modello",
    targa: "AB123CD",
    matricola: "M-1",
    tipoAttrezzatura: "—",
    anno: 2024,
    oreKm: 0,
    statoAttuale: "Operativo",
    dataUltimaUscita: "—",
    note: "",
    priorita: "normale",
    ultimaModifica: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}

function sampleLog(overrides: Partial<LogModificaWithProfileRow> = {}): LogModificaWithProfileRow {
  return {
    id: "log-1",
    entita: "mezzi",
    entita_id: "m-1",
    azione: "UPDATE",
    autore_id: "u-1",
    payload: {
      before: {
        id: "m-1",
        cliente: "Cliente",
        utilizzatore: null,
        marca: "Marca",
        modello: "Modello",
        targa: "AA111AA",
        matricola: "OLD",
        numero_scuderia: null,
        tipo_attrezzatura: null,
        anno: 2024,
        meta: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      after: {
        id: "m-1",
        cliente: "Cliente",
        utilizzatore: null,
        marca: "Marca",
        modello: "Modello",
        targa: "AB123CD",
        matricola: "NEW",
        numero_scuderia: null,
        tipo_attrezzatura: null,
        anno: 2024,
        meta: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-06-12T15:30:00.000Z",
      },
    },
    created_at: "2026-06-12T15:30:00.000Z",
    profiles: { nome: "Mario Rossi", username: "mario" },
    ...overrides,
  } as LogModificaWithProfileRow;
}

const fromLogs = buildUltimaModificaByMezzoIdFromLogs([sampleLog()]);
const info = fromLogs.get("m-1");
assert.ok(info);
assert.match(info!.summaryShort, /Targa|Matricola/);
assert.match(formatMezzoUltimaModificaTooltip(info!) ?? "", /Matricola|Targa/);

const fallback = resolveMezzoUltimaModificaInfo(sampleMezzo(), new Map());
assert.equal(fallback.summaryShort, "Anagrafica aggiornata");

console.log("mezzo-ultima-modifica-info.test.ts: ok");
