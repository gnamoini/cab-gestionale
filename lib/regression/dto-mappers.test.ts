import assert from "node:assert/strict";
import {
  enrichLavorazioneListRowsWithMezzi,
  mapLavorazioneLightToListRow,
  mapMezzoLightToRow,
  mezziRowsToIdMap,
} from "@/lib/db/dto-mappers";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow, MezzoRow } from "@/src/types/supabase-tables";

const mezzo: MezzoRow = {
  id: "m1",
  cliente: "Cliente A",
  utilizzatore: "U1",
  marca: "Marca",
  modello: "Modello",
  targa: "AA001",
  matricola: null,
  numero_scuderia: null,
  tipo_attrezzatura: "trattore",
  anno: 2020,
  meta: null,
  entity_key: "ek1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const lavRaw: LavorazioneRow & { mezzi?: MezzoRow } = {
  id: "l1",
  mezzo_id: "m1",
  stato: "in_lavorazione",
  priorita: "normale",
  data_ingresso: "2026-01-02",
  data_uscita: null,
  note: null,
  created_by: "u1",
  created_at: "2026-01-02T00:00:00Z",
  updated_at: "2026-01-03T00:00:00Z",
  updated_by: "u2",
  archived: false,
  archived_at: null,
  deleted_at: null,
  codice: "L-1",
  mezzi: mezzo,
};

assert.equal(mapMezzoLightToRow({ ...mezzo, meta: undefined as unknown as null }).meta, null);

const mapped = mapLavorazioneLightToListRow(lavRaw, { includeMezzo: true });
assert.equal(mapped.mezzo?.cliente, "Cliente A");
assert.equal(mapped.updated_by_nome, null);

const noEmbed = mapLavorazioneLightToListRow(lavRaw, { includeMezzo: false });
assert.equal(noEmbed.mezzo, null);

const row: LavorazioneListRow = { ...mapped, mezzo: null };
const enriched = enrichLavorazioneListRowsWithMezzi([row], mezziRowsToIdMap([mezzo]));
assert.equal(enriched[0]?.mezzo?.marca, "Marca");

console.log("dto-mappers.test.ts OK");
