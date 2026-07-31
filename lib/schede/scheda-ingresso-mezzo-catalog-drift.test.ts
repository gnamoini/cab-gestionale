import assert from "node:assert/strict";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import { listMezzoCatalogFieldDrifts } from "@/lib/schede/scheda-ingresso-mezzo-catalog-drift";
import type { MezzoGestito } from "@/lib/mezzi/types";

const mezzo = {
  id: "m1",
  cliente: "Recuperi Pugliesi",
  utilizzatore: "Mario Rossi",
  marca: "Nextra",
  modello: "K-MD24T",
  matricola: "386/213",
  targa: "ET897CD",
  tipoAttrezzatura: "Gru",
} as MezzoGestito;

const base = buildSchedaIngressoFieldsFromMezzo(mezzo);

assert.deepEqual(listMezzoCatalogFieldDrifts(base, mezzo, []), []);

const edited = { ...base, utilizzatore: "AMIU Bari" };
assert.deepEqual(listMezzoCatalogFieldDrifts(edited, mezzo, ["utilizzatore"]), [
  { field: "utilizzatore", savedValue: "Mario Rossi" },
]);

assert.deepEqual(listMezzoCatalogFieldDrifts(edited, mezzo, ["cliente"]), []);

console.log("scheda-ingresso-mezzo-catalog-drift.test.ts: ok");
