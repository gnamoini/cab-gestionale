import assert from "node:assert/strict";
import {
  composeMezzoGestitoFromRows,
  pickAttrezzaturaForContext,
  pickPrimaryAttrezzatura,
} from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
import { mezzoGestitoToEmbedRow } from "@/lib/mezzi/mezzi-attrezzature-batch";
import type { AttrezzaturaRow, MezzoRow } from "@/src/types/supabase-tables";

const mezzo: MezzoRow = {
  id: "m1",
  cliente: "Cliente",
  utilizzatore: null,
  targa: "AB123",
  numero_scuderia: null,
  anno: 2020,
  meta: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const attA: AttrezzaturaRow = {
  id: "a1",
  mezzo_id: "m1",
  marca: "Cat",
  modello: "320",
  matricola: "M1",
  tipo_attrezzatura: "Esc",
  portata: null,
  anno: 2020,
  note: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  created_by: null,
};

const attB: AttrezzaturaRow = {
  ...attA,
  id: "a2",
  marca: "Komatsu",
  modello: "PC200",
  created_at: "2026-01-02",
};

assert.equal(pickPrimaryAttrezzatura([attA, attB], "m1")?.id, "a1");
assert.equal(pickAttrezzaturaForContext([attA, attB], "m1", "a2")?.id, "a2");
assert.equal(pickAttrezzaturaForContext([attA, attB], "m1", "wrong")?.id, "a1");

const gestito = composeMezzoGestitoFromRows(mezzo, pickPrimaryAttrezzatura([attA, attB], "m1"));
assert.equal(gestito.marca, "Cat");
const embed = mezzoGestitoToEmbedRow(gestito);
assert.equal(embed.marca, "Cat");

console.log("mezzi-attrezzature-batch.test.ts OK");
