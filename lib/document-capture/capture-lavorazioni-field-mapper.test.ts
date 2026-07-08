import assert from "node:assert/strict";
import {
  buildCaptureSchedeBundle,
  mapCaptureFieldsToLavorazioni,
  mapCaptureHeaderToIngressoSlice,
  parseCaptureLavorazioniRighe,
  type CaptureFieldRow,
} from "@/lib/document-capture/capture-field-mapper";

function row(field_key: string, value: string): CaptureFieldRow {
  return { field_key, confirmed_value: value, normalized_value: value };
}

const threeRows: CaptureFieldRow[] = [
  row("riga_1_lavorazione", "Cambio olio"),
  row("riga_1_nome", "Mario"),
  row("riga_1_ore", "2"),
  row("riga_2_lavorazione", "Filtro aria"),
  row("riga_2_nome", "Luigi"),
  row("riga_2_ore", "1,5"),
  row("riga_3_lavorazione", "Revisione"),
  row("riga_3_nome", "Anna"),
  row("riga_3_ore", "3"),
];

const righe = parseCaptureLavorazioniRighe(threeRows);
assert.equal(righe.length, 3);
assert.equal(righe[0]?.lavorazioniEffettuate, "Cambio olio");
assert.equal(righe[0]?.addettiAssegnati[0]?.addetto, "Mario");
assert.equal(righe[0]?.addettiAssegnati[0]?.oreImpiegate, 2);
assert.equal(righe[1]?.addettiAssegnati[0]?.oreImpiegate, 1.5);

const header = mapCaptureHeaderToIngressoSlice([
  row("cliente", "ACME Srl"),
  row("targa_matricola", "AB123CD"),
]);
assert.equal(header.cliente, "ACME Srl");
assert.equal(header.targa, "AB123CD");

const lav = mapCaptureFieldsToLavorazioni([
  row("cliente", "ACME Srl"),
  row("targa_matricola", "MAT-999"),
  ...threeRows,
]);
assert.equal(lav.identificazioneMacchina, "MAT-999");
assert.equal(lav.righe.length, 3);

const sparse = parseCaptureLavorazioniRighe([
  row("riga_1_lavorazione", "A"),
  row("riga_1_nome", "X"),
  row("riga_1_ore", "1"),
  row("riga_3_lavorazione", "C"),
  row("riga_3_nome", "Z"),
  row("riga_3_ore", "2"),
]);
assert.equal(sparse.length, 2);
assert.equal(sparse[1]?.lavorazioniEffettuate, "C");

const bundle = buildCaptureSchedeBundle({
  lavorazioneId: "lav-1",
  fields: [
    row("scheda_tipo", "lavorazioni"),
    row("cliente", "Cliente Test"),
    row("targa_matricola", "ZZ999XX"),
    row("riga_1_lavorazione", "Riparazione"),
    row("riga_1_nome", "Paolo"),
    row("riga_1_ore", "4"),
  ],
  createdBy: "test",
  includeLavorazioni: true,
});
assert.equal(bundle.ingresso?.campi.cliente, "Cliente Test");
assert.equal(bundle.lavorazioni?.campi.righe.length, 1);
assert.equal(bundle.lavorazioni?.campi.righe[0]?.lavorazioniEffettuate, "Riparazione");
assert.equal(bundle.lavorazioni?.campi.identificazioneMacchina, "ZZ999XX");

console.log("capture-lavorazioni-field-mapper.test.ts OK");
