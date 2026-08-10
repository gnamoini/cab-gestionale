import assert from "node:assert/strict";
import {
  findMezzoForLavorazione,
  resolveMezzoForLavorazioneEdit,
} from "@/lib/schede/schede-autofill";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";

const mezzoFk: MezzoGestito = {
  id: "mezzo-tecnowaste",
  cliente: "TecnoWaste",
  utilizzatore: "Martano",
  marca: "Coseco",
  modello: "K6",
  targa: "GP823GL",
  matricola: "017/16",
  tipoAttrezzatura: "—",
  anno: 2020,
  oreKm: 0,
  statoAttuale: "Operativo",
  dataUltimaUscita: "2024-01-01",
  note: "",
  priorita: "normale",
};

const mezzoFuzzy: MezzoGestito = {
  ...mezzoFk,
  id: "mezzo-amiu",
  cliente: "AMIU Bari",
  utilizzatore: "Bari",
  matricola: "1586",
  targa: "",
};

const lav: LavorazioneAttiva = {
  id: "lav-1",
  macchina: "Coseco K6",
  targa: "GP823GL",
  matricola: "017/16",
  nScuderia: "",
  cliente: "TecnoWaste",
  utilizzatore: "Martano",
  cantiere: "Martano",
  statoId: "in_lavorazione",
  priorita: "media",
  addetto: "—",
  note: "",
  dataIngresso: "2026-01-01",
  dataCompletamento: null,
};

const catalog = [mezzoFuzzy, mezzoFk];

assert.equal(findMezzoForLavorazione(catalog, lav)?.id, "mezzo-amiu");
assert.equal(resolveMezzoForLavorazioneEdit(catalog, lav, "mezzo-tecnowaste")?.id, "mezzo-tecnowaste");
assert.equal(resolveMezzoForLavorazioneEdit(catalog, lav, null)?.id, "mezzo-amiu");
