import assert from "node:assert/strict";
import { documentoMatchesMarcaModello } from "@/lib/documenti/documenti-match";
import { documentoRowToGestionale, mezzoGestitoFromRow } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { DocumentoRow, MezzoRow } from "@/src/types/supabase-tables";

const mezzoHint: MezzoRow = {
  id: "m1",
  cliente: "C",
  utilizzatore: null,
  targa: "X",
  marca: "Cat",
  modello: "320",
  matricola: "M1",
  tipo_attrezzatura: null,
  marca_telaio: null,
  modello_telaio: null,
  tipo_telaio: null,
  numero_scuderia: null,
  km: null,
  anno: 2020,
  note: null,
  meta: {},
  created_at: "",
  updated_at: "",
};

const gestito = mezzoGestitoFromRow(mezzoHint, { attrezzaturaId: "a1" });
assert.equal(gestito.marca, "Cat");

const doc: DocumentoRow = {
  id: "d1",
  mezzo_id: "m1",
  marca: "Cat",
  modello: "320",
  categoria: "manuale",
  url_file: "x",
  meta: {},
  created_at: "",
};

const match = documentoMatchesMarcaModello(
  documentoRowToGestionale(doc),
  gestito.marca,
  gestito.modello,
);
assert.equal(match, true);

const emptyMarca = mezzoGestitoFromRow({ ...mezzoHint, marca: "—" });
assert.equal(emptyMarca.marca, "—");

console.log("lavorazione-documenti-slice.test.ts OK");
