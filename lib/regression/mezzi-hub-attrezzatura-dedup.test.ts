import assert from "node:assert/strict";
import { attrezzaturaMirrorsMezzo } from "@/lib/mezzi/attrezzatura-mirrors-mezzo";
import type { AttrezzaturaGestita } from "@/lib/attrezzature/types";
import type { MezzoGestito } from "@/lib/mezzi/types";

const mezzo = {
  id: "m1",
  marca: "Tecno Industrie",
  modello: "AZIMUT",
  matricola: "T1S 094453/20",
  tipoAttrezzatura: "Costipatore",
} as MezzoGestito;

const mirror: AttrezzaturaGestita = {
  id: "a1",
  mezzoId: "m1",
  marca: "Tecno Industrie",
  modello: "AZIMUT",
  matricola: "T1S 094453/20",
  tipoAttrezzatura: "Costipatore",
  portata: "—",
  anno: 2026,
  note: "",
};

const distinct: AttrezzaturaGestita = {
  ...mirror,
  id: "a2",
  modello: "ALTRO",
};

assert.equal(attrezzaturaMirrorsMezzo(mezzo, mirror), true, "linked row mirroring mezzo anagrafica");
assert.equal(attrezzaturaMirrorsMezzo(mezzo, distinct), false, "different modello is not a mirror");

console.log("mezzi-hub-attrezzatura-dedup.test.ts OK");
