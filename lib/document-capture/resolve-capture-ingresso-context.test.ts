import assert from "node:assert/strict";
import { resolveCaptureIngressoContext } from "@/lib/document-capture/resolve-capture-ingresso-context";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";

function row(key: string, value: string): CaptureFieldRow {
  return { field_key: key, confirmed_value: value, normalized_value: value };
}

const mezzo: MezzoGestito = {
  id: "m-1",
  cliente: "Rossi",
  utilizzatore: "",
  marca: "CAT",
  modello: "320",
  targa: "AB123CD",
  matricola: "",
  tipoAttrezzatura: "",
  anno: 2020,
  oreKm: 0,
  statoAttuale: "",
  dataUltimaUscita: "",
  note: "",
  priorita: "normale",
};

const attive: LavorazioneAttiva[] = [
  {
    id: "lav-1",
    codice: "26-0001",
    macchina: "CAT",
    cliente: "Rossi",
    targa: "AB123CD",
    matricola: "",
    nScuderia: "",
    utilizzatore: "",
    cantiere: "",
    statoId: "accettazione",
    priorita: "media",
    addetto: "",
    note: "",
    dataIngresso: "2026-01-01",
    dataCompletamento: null,
  },
];

const ctx = resolveCaptureIngressoContext({
  captureFields: [row("targa", "AB123CD")],
  mezziCatalog: [mezzo],
  attive,
  schedeStore: {},
});

assert.ok(ctx.lavorazione.recommendedMatch);
assert.ok(ctx.mezzo.recommendedMatch);
assert.equal(ctx.mezzo.decision, "auto_suggest");

console.log("resolve-capture-ingresso-context.test.ts OK");
