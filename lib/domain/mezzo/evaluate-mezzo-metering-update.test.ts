import assert from "node:assert/strict";
import {
  buildMeteringPatchFromScheda,
  evaluateMezzoMeteringUpdate,
} from "@/lib/domain/mezzo/evaluate-mezzo-metering-update";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

const base: SchedaIngressoFields = {
  dataIngresso: "01/01/2026",
  cliente: "X",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "",
  modelloAttrezzatura: "",
  matricola: "",
  nScuderia: "",
  oreLavoro: "120",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  vin: "",
  targa: "",
  km: "110000",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  richiedenteTelefono: "",
  targetType: "telaio",
  attrezzaturaId: "",
};

const mezzo: MezzoGestito = {
  id: "m1",
  cliente: "X",
  utilizzatore: "—",
  marca: "M",
  modello: "M",
  targa: "—",
  matricola: "—",
  numeroScuderia: "—",
  tipoAttrezzatura: "—",
  anno: 2024,
  cantiere: "—",
  tipoTelaio: "—",
  marcaTelaio: "—",
  modelloTelaio: "—",
  oreKm: 100,
  km: 110000,
  statoAttuale: "Operativo",
  dataUltimaUscita: "2024-01-01",
  note: "",
  priorita: "normale",
  ultimoAggiornamentoDaLavorazioneId: "lav-1",
};

function run() {
  const lower = evaluateMezzoMeteringUpdate("km", "100000", mezzo);
  assert.equal(lower.action, "warn_lower");

  const patch = buildMeteringPatchFromScheda(base, mezzo, ["km"], "lav-1");
  assert.equal(Object.keys(patch).length, 0, "idempotent retry same lavorazioneId");

  const patchNew = buildMeteringPatchFromScheda(base, mezzo, ["km"], "lav-2");
  assert.equal(patchNew.ultimo_aggiornamento_da_lavorazione_id, "lav-2");
  assert.equal(patchNew.ultimo_km_rilevato, 110000);

  console.log("evaluate-mezzo-metering-update.test.ts OK");
}

run();
