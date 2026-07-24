import assert from "node:assert/strict";
import { filterMezziGestiti } from "@/lib/mezzi/mezzi-list-fetch";
import type { MezzoGestito } from "@/lib/mezzi/types";

const base: MezzoGestito = {
  id: "m1",
  cliente: "Rossi Srl",
  utilizzatore: "Mario Rossi",
  marca: "Caterpillar",
  modello: "320",
  targa: "AB123CD",
  matricola: "MAT-01",
  numeroScuderia: "S-7",
  tipoAttrezzatura: "Escavatore",
  cantiere: "Cantiere Nord",
  marcaTelaio: "CAT",
  modelloTelaio: "T-9",
  tipoTelaio: "Gommato",
  vin: "VIN123456",
  anno: 2020,
  oreKm: 1200,
  statoAttuale: "Operativo",
  dataUltimaUscita: "—",
  note: "",
  priorita: "normale",
  tagliandi: true,
};

assert.equal(
  filterMezziGestiti([base], { cantiere: "nord" }).length,
  1,
);
assert.equal(
  filterMezziGestiti([base], { utilizzatore: "mario" }).length,
  1,
);
assert.equal(
  filterMezziGestiti([base], { vin: "vin123" }).length,
  1,
);
assert.equal(
  filterMezziGestiti([base], { search: "escavatore s-7" }).length,
  1,
);
assert.equal(
  filterMezziGestiti([base], { cliente: "rossi" }).length,
  1,
);
assert.equal(
  filterMezziGestiti([base], { targa: "ab123" }).length,
  1,
);
assert.equal(
  filterMezziGestiti([base], { numero_scuderia: "s-7" }).length,
  1,
);

console.log("mezzi-list-fetch.test.ts OK");
