import assert from "node:assert/strict";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import { mergeSchedaIngressoWithMezzoPriority } from "@/lib/schede/merge-scheda-ingresso-with-mezzo-priority";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

const empty = (): SchedaIngressoFields => ({
  dataIngresso: "01/01/2026",
  cliente: "",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "",
  modelloAttrezzatura: "",
  matricola: "",
  nScuderia: "",
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  vin: "",
  targa: "",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  richiedenteTelefono: "",
  noteIntervento: "",
});

const mezzo: MezzoGestito = {
  id: "m1",
  cliente: "AMIU Bari",
  utilizzatore: "",
  marca: "Ravo",
  modello: "CityCat",
  targa: "AB123",
  matricola: "MAT1",
  numeroScuderia: "",
  tipoAttrezzatura: "—",
  anno: 2020,
  oreKm: 5000,
  km: 120000,
  statoAttuale: "",
  dataUltimaUscita: "",
  note: "nota mezzo",
  priorita: "normale",
  ultimaModifica: "2026-01-01T10:00:00.000Z",
};

const fromMezzo = buildSchedaIngressoFieldsFromMezzo(mezzo);
assert.equal(fromMezzo.km, "");
assert.equal(fromMezzo.oreLavoro, "");
assert.equal(fromMezzo.noteIntervento, "");
assert.equal(fromMezzo.marcaAttrezzatura, "Ravo");

const oldScheda: SchedaIngressoFields = {
  ...empty(),
  marcaAttrezzatura: "Bucher",
  matricola: "MAT1",
  km: "99999",
  descrizioneAnomalia: "vecchia anomalia",
};

const merged = mergeSchedaIngressoWithMezzoPriority(empty(), {
  fromScheda: oldScheda,
  linkedMezzo: mezzo,
});
assert.equal(merged.marcaAttrezzatura, "Ravo", "mezzo SSOT batte scheda vecchia errata");
assert.equal(merged.km, "", "km non copiato da scheda");
assert.equal(merged.descrizioneAnomalia, "", "anomalia non copiata");

const noMezzo = mergeSchedaIngressoWithMezzoPriority(empty(), { fromScheda: oldScheda });
assert.equal(noMezzo.marcaAttrezzatura, "Bucher", "senza mezzo, scheda come fallback");

console.log("merge-scheda-ingresso-with-mezzo-priority.test.ts: ok");
