import assert from "node:assert/strict";
import {
  countMezziInOfficinaProxy,
  countMezziOperativiProxy,
  disponibilitaFlottaPctProxy,
} from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { buildFleetLavorazioniIndex } from "@/lib/report/kpi-performance/fleet-lavorazioni-index";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

const mezzoEmbed: MezzoRow = {
  id: "mezzo-a",
  cliente: "Cliente A",
  utilizzatore: null,
  marca: "Caterpillar",
  modello: "320",
  targa: "AB123CD",
  matricola: "MAT-001",
  numero_scuderia: null,
  tipo_attrezzatura: "Escavatore",
  anno: 2020,
  meta: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

const mezzoA: MezzoGestito = {
  id: "mezzo-a",
  cliente: "Cliente A",
  utilizzatore: "—",
  marca: "Caterpillar",
  modello: "320",
  targa: "AB123CD",
  matricola: "MAT-001",
  tipoAttrezzatura: "Escavatore",
  anno: 2020,
  oreKm: 0,
  statoAttuale: "Operativo",
  dataUltimaUscita: "2024-01-01",
  note: "",
  priorita: "normale",
};

const mezzoB: MezzoGestito = { ...mezzoA, id: "mezzo-b", cliente: "Cliente B" };

function lavRow(overrides: Partial<LavorazioneListRow> & { id: string }): LavorazioneListRow {
  return {
    mezzo_id: "mezzo-a",
    stato: "in_lavorazione",
    priorita: "media",
    data_ingresso: "2025-01-15",
    data_uscita: null,
    note: null,
    created_by: null,
    created_at: "2025-01-15T00:00:00.000Z",
    updated_at: "2025-01-15T00:00:00.000Z",
    archived: false,
    archived_at: null,
    deleted_at: null,
    codice: null,
    mezzo: mezzoEmbed,
    ...overrides,
  };
}

const mezzi = [mezzoA, mezzoB];
const lavRows = [
  lavRow({ id: "lav-1", mezzo_id: "mezzo-a", archived: false }),
  lavRow({ id: "lav-2", mezzo_id: "mezzo-b", archived: true, data_uscita: "2025-02-01" }),
];

const index = buildFleetLavorazioniIndex(mezzi, lavRows);

assert.equal(countMezziOperativiProxy(mezzi, lavRows), countMezziOperativiProxy(mezzi, lavRows, index));
assert.equal(countMezziInOfficinaProxy(mezzi, lavRows), countMezziInOfficinaProxy(mezzi, lavRows, index));
assert.equal(
  disponibilitaFlottaPctProxy(mezzi, lavRows),
  disponibilitaFlottaPctProxy(mezzi, lavRows, index),
);

console.log("fleet-lavorazioni-index.test.ts OK");
