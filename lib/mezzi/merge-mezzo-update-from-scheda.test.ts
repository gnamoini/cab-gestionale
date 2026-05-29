import assert from "node:assert/strict";
import {
  isMezzoIncomingScalarEmpty,
  mezzoGestitoToMergeExisting,
  mergeMezzoUpdateFromScheda,
} from "@/lib/mezzi/merge-mezzo-update-from-scheda";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoInsert } from "@/src/services/mezzi.service";

const baseMezzo: MezzoGestito = {
  id: "m1",
  cliente: "Cliente A",
  utilizzatore: "—",
  marca: "Marca X",
  modello: "Modello Y",
  targa: "AB123CD",
  matricola: "MAT-001",
  numeroScuderia: "S10",
  tipoAttrezzatura: "Escavatore",
  cantiere: "Cantiere Nord",
  anno: 2020,
  oreKm: 100,
  statoAttuale: "Operativo",
  dataUltimaUscita: "2024-01-01",
  note: "",
  priorita: "normale",
};

const incomingFull: MezzoInsert = {
  cliente: "Cliente B",
  utilizzatore: null,
  marca: "Marca Z",
  modello: "—",
  targa: null,
  matricola: null,
  numero_scuderia: null,
  tipo_attrezzatura: null,
  anno: 2026,
  meta: { cantiere: "Nuovo cantiere" },
};

assert.equal(isMezzoIncomingScalarEmpty(null), true);
assert.equal(isMezzoIncomingScalarEmpty(""), true);
assert.equal(isMezzoIncomingScalarEmpty("—"), true);
assert.equal(isMezzoIncomingScalarEmpty("  AB  "), false);

const existing = mezzoGestitoToMergeExisting(baseMezzo);
const patch = mergeMezzoUpdateFromScheda(existing, incomingFull);

assert.equal(patch.cliente, "Cliente B");
assert.equal(patch.marca, "Marca Z");
assert.equal(patch.targa, undefined);
assert.equal(patch.matricola, undefined);
assert.equal(patch.modello, undefined);
assert.equal(patch.anno, undefined);
assert.equal(patch.utilizzatore, undefined);

const incomingPartial: MezzoInsert = {
  cliente: "Cliente A",
  utilizzatore: "Util Nuovo",
  marca: "Marca X",
  modello: "Modello Nuovo",
  targa: "AB123CD",
  matricola: "MAT-001",
  numero_scuderia: "S10",
  tipo_attrezzatura: "Escavatore",
  anno: 2026,
  meta: {},
};

const patch2 = mergeMezzoUpdateFromScheda(existing, incomingPartial);
assert.equal(patch2.utilizzatore, "Util Nuovo");
assert.equal(patch2.modello, "Modello Nuovo");
assert.equal(patch2.anno, undefined);

const incomingMetaOnly: MezzoInsert = {
  ...incomingPartial,
  utilizzatore: null,
  modello: "Modello Y",
  meta: { cantiere: "Cantiere Sud", km: 50 },
};

const patch3 = mergeMezzoUpdateFromScheda(existing, incomingMetaOnly);
assert.ok(patch3.meta);
assert.equal((patch3.meta as { cantiere?: string }).cantiere, "Cantiere Sud");

console.log("merge-mezzo-update-from-scheda.test.ts OK");
