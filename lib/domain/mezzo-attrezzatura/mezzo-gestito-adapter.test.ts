import assert from "node:assert/strict";
import {
  attrezzaturaRowFromEnrichedMezzo,
  mezzoGestitoFromRow,
  pickAttrezzaturaForContext,
} from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
import type { AttrezzaturaRow, MezzoRow } from "@/src/types/supabase-tables";

const baseMezzo: MezzoRow = {
  id: "m1",
  cliente: "Cliente A",
  utilizzatore: null,
  targa: "AB123CD",
  marca_telaio: null,
  modello_telaio: null,
  tipo_telaio: null,
  numero_scuderia: null,
  km: null,
  anno: 2020,
  note: null,
  meta: {},
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

const att1: AttrezzaturaRow = {
  id: "a1",
  mezzo_id: "m1",
  marca: "Cat",
  modello: "320",
  matricola: "MAT-1",
  tipo_attrezzatura: "Escavatore",
  portata: null,
  anno: 2020,
  note: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  created_by: null,
};

const att2: AttrezzaturaRow = {
  ...att1,
  id: "a2",
  matricola: "MAT-2",
  created_at: "2024-01-02T00:00:00Z",
};

// Mezzo senza attrezzatura → marca "—"
const noAtt = mezzoGestitoFromRow(baseMezzo);
assert.equal(noAtt.marca, "—");
assert.equal(noAtt.matricola, "Non assegnata");

// Attrezzatura esplicita
const withAtt = mezzoGestitoFromRow(baseMezzo, { attrezzatura: att1 });
assert.equal(withAtt.marca, "Cat");
assert.equal(withAtt.matricola, "MAT-1");

// Batch + preferred attrezzatura_id
const picked = mezzoGestitoFromRow(baseMezzo, {
  attrezzature: [att1, att2],
  attrezzaturaId: "a2",
});
assert.equal(picked.matricola, "MAT-2");

assert.equal(pickAttrezzaturaForContext([att1, att2], "m1", "a2")?.id, "a2");

// Embed arricchito
const enriched: MezzoRow = {
  ...baseMezzo,
  marca: "Volvo",
  modello: "EC220",
  matricola: "EM-1",
  tipo_attrezzatura: "Escavatore",
};
const fromEmbed = mezzoGestitoFromRow(enriched, { attrezzaturaId: "a1" });
assert.equal(fromEmbed.marca, "Volvo");

const synth = attrezzaturaRowFromEnrichedMezzo(enriched, "a1", "m1");
assert.ok(synth);
assert.equal(synth!.marca, "Volvo");

console.log("mezzo-gestito-adapter.test.ts OK");
