import assert from "node:assert/strict";
import { pickAttrezzaturaForContext, composeMezzoGestitoFromRows } from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
import { mezzoGestitoToEmbedRow } from "@/lib/mezzi/mezzi-attrezzature-batch";
import type { AttrezzaturaRow, MezzoRow } from "@/src/types/supabase-tables";

const mezzo: MezzoRow = {
  id: "m1",
  cliente: "C",
  utilizzatore: null,
  targa: "X",
  numero_scuderia: null,
  anno: null,
  meta: null,
  created_at: "",
  updated_at: "",
};

const attPrimary: AttrezzaturaRow = {
  id: "a1",
  mezzo_id: "m1",
  marca: "Primary",
  modello: "P",
  matricola: null,
  tipo_attrezzatura: null,
  portata: null,
  anno: null,
  note: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  created_by: null,
};

const attTarget: AttrezzaturaRow = {
  ...attPrimary,
  id: "a2",
  marca: "Target",
  modello: "T",
  created_at: "2026-01-02",
};

const att = pickAttrezzaturaForContext([attPrimary, attTarget], "m1", "a2");
const embed = mezzoGestitoToEmbedRow(composeMezzoGestitoFromRows(mezzo, att));
assert.equal(embed.marca, "Target");
assert.equal(embed.modello, "T");

console.log("lavorazioni-list-enrich.test.ts OK");
