import assert from "node:assert/strict";
import {
  formatMezzoPickerBands,
  formatMezzoPickerCompactLines,
  formatMezzoSearchResultLines,
} from "@/lib/mezzi/format-mezzo-search-result";
import type { MezzoGestito } from "@/lib/mezzi/types";

function mezzo(partial: Partial<MezzoGestito> & Pick<MezzoGestito, "id">): MezzoGestito {
  return {
    cliente: "",
    utilizzatore: "",
    marca: "",
    modello: "",
    targa: "",
    matricola: "",
    tipoAttrezzatura: "",
    anno: 0,
    oreKm: 0,
    statoAttuale: "",
    dataUltimaUscita: "",
    note: "",
    priorita: "normale",
    ...partial,
  };
}

const full = mezzo({
  id: "m1",
  cliente: "Simeone",
  cantiere: "Cantiere A",
  utilizzatore: "Mario Rossi",
  marca: "Iveco",
  modello: "120E25",
  matricola: "MAT-001",
  numeroScuderia: "12",
  marcaTelaio: "Mercedes",
  modelloTelaio: "Antos",
  targa: "FY109RX",
  vin: "WDB123",
});

const bands = formatMezzoPickerBands(full);
assert.equal(bands.length, 3);
assert.equal(bands[0]!.id, "cliente");
assert.equal(bands[0]!.fields.length, 3);
assert.equal(bands[1]!.id, "attrezzatura");
assert.equal(bands[1]!.fields.length, 4);
assert.equal(bands[2]!.id, "telaio");
assert.equal(bands[2]!.fields.length, 4);

const sparse = mezzo({
  id: "m2",
  cliente: "AMI",
  targa: "FK004MM",
  marca: "Guimatrag",
});
const sparseBands = formatMezzoPickerBands(sparse);
assert.equal(sparseBands.length, 3, "cliente + attrezzatura + telaio parziali");
assert.ok(
  !sparseBands.some((b) => b.fields.length === 0),
  "nessuna banda vuota",
);
assert.ok(
  !sparseBands.find((b) => b.id === "cliente")!.fields.some((f) => f.label === "Cantiere"),
  "cantiere vuoto nascosto",
);

const empty = mezzo({ id: "m3" });
assert.equal(formatMezzoPickerBands(empty).length, 0);

const compact = formatMezzoPickerCompactLines(full);
assert.equal(compact.length, 2);
assert.equal(compact[0], "Simeone · Cantiere A · Mario Rossi");
assert.equal(compact[1], "Iveco · 120E25 · MAT-001 · 12 — Mercedes · Antos · FY109RX · WDB123");
assert.deepEqual(formatMezzoPickerCompactLines(empty), []);
assert.deepEqual(formatMezzoPickerCompactLines(sparse), [
  "AMI",
  "Guimatrag — FK004MM",
]);

const lines = formatMezzoSearchResultLines(full);
assert.ok(lines.primary.includes("FY109RX"));
assert.ok(lines.secondary.includes("Iveco"));

console.log("format-mezzo-search-result.test.ts OK");
