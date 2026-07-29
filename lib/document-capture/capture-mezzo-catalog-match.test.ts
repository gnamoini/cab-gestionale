import assert from "node:assert/strict";
import {
  hashCaptureMezzoMatchReasons,
  isCaptureMezzoMatchAutoSuggest,
  scoreCaptureMezzoCandidates,
} from "@/lib/document-capture/capture-mezzo-catalog-match";
import { resolveCaptureMezzoMatch } from "@/lib/document-capture/resolve-capture-mezzo-match";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import type { MezzoGestito } from "@/lib/mezzi/types";

function row(key: string, value: string): CaptureFieldRow {
  return { field_key: key, confirmed_value: value, normalized_value: value };
}

const mezzoA: MezzoGestito = {
  id: "m-1",
  cliente: "AMIU",
  utilizzatore: "",
  marca: "Dulevo",
  modello: "5000",
  targa: "AB123CD",
  matricola: "MAT-1",
  numeroScuderia: "",
  tipoAttrezzatura: "Spazzatrice",
  anno: 2020,
  oreKm: 100,
  statoAttuale: "attivo",
  dataUltimaUscita: "",
  note: "",
  priorita: "normale",
};

const mezzoB: MezzoGestito = {
  ...mezzoA,
  id: "m-2",
  targa: "XY999ZZ",
  matricola: "MAT-2",
};

const fields = [row("targa", "AB123CD"), row("matricola", "MAT-1")];
const ranked = scoreCaptureMezzoCandidates(
  { targa: "AB123CD", matricola: "MAT-1", nScuderia: "", vin: "", cliente: "" },
  [mezzoA, mezzoB],
);
assert.equal(ranked.length, 1);
assert.equal(ranked[0]!.mezzo.id, "m-1");
assert.ok(isCaptureMezzoMatchAutoSuggest(ranked[0]!.matchStrength));

const clienteOnly = scoreCaptureMezzoCandidates(
  { targa: "", matricola: "", nScuderia: "", vin: "", cliente: "AMIU" },
  [mezzoA],
);
assert.equal(clienteOnly.length, 0);

const resolution = resolveCaptureMezzoMatch({
  captureFields: fields,
  mezziCatalog: [mezzoA, mezzoB],
});
assert.equal(resolution.decision, "auto_suggest");
assert.ok(resolution.reasonsSummary.length > 0);
assert.ok(hashCaptureMezzoMatchReasons(resolution.recommendedMatch!.reasons).length > 0);

console.log("capture-mezzo-catalog-match.test.ts OK");
