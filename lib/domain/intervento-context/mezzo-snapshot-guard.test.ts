import assert from "node:assert/strict";
import { composeInterventoContext } from "@/lib/domain/intervento-context/build-intervento-context";
import type { MezzoGestito } from "@/lib/mezzi/types";

const partialMezzo = {
  id: "m-partial",
  cliente: undefined,
  utilizzatore: undefined,
  marca: "CAT",
  modello: undefined,
  targa: undefined,
  matricola: undefined,
  tipoAttrezzatura: undefined,
  anno: 0,
  oreKm: 0,
  statoAttuale: "—",
  dataUltimaUscita: "—",
  note: "",
  priorita: "normale",
} as unknown as MezzoGestito;

const ctx = composeInterventoContext({
  lavorazioneId: "lav-1",
  mezzoGestito: partialMezzo,
});

assert.equal(ctx.mezzo.cliente, "");
assert.equal(ctx.mezzo.marca, "CAT");

console.log("mezzo-snapshot-guard.test.ts OK");
