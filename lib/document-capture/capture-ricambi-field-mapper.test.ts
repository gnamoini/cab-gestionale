import assert from "node:assert/strict";
import {
  buildCaptureSchedeBundle,
  mapCaptureFieldsToRicambi,
  mapCaptureHeaderToIngressoSlice,
  parseCaptureRicambiRighe,
  type CaptureFieldRow,
} from "@/lib/document-capture/capture-field-mapper";

function row(field_key: string, value: string): CaptureFieldRow {
  return { field_key, confirmed_value: value, normalized_value: value };
}

const twoRows: CaptureFieldRow[] = [
  row("riga_1_nome", "Filtro olio"),
  row("riga_1_codice", "FO-001"),
  row("riga_1_qt", "2"),
  row("riga_1_data", "01/03/2026"),
  row("riga_2_nome", "Guarnizione"),
  row("riga_2_codice", "G-99"),
  row("riga_2_qt", "1,5"),
  row("riga_2_data", "02/03/2026"),
];

const righe = parseCaptureRicambiRighe(twoRows);
assert.equal(righe.length, 2);
assert.equal(righe[0]?.ricambioNome, "Filtro olio");
assert.equal(righe[0]?.codice, "FO-001");
assert.equal(righe[0]?.quantita, 2);
assert.equal(righe[0]?.dataUtilizzo, "01/03/2026");
assert.equal(righe[0]?.addetto, "");
assert.equal(righe[1]?.quantita, 1.5);

const composed = parseCaptureRicambiRighe([
  row("riga_1_nome", "O-ring"),
  row("riga_1_descrizione", "Diametro 50mm"),
  row("riga_1_codice", "OR-50"),
  row("riga_1_qt", "3"),
]);
assert.equal(composed[0]?.ricambioNome, "O-ring — Diametro 50mm");

const soloDescrizione = parseCaptureRicambiRighe([
  row("riga_1_descrizione", "Vite M8"),
  row("riga_1_qt", "10"),
]);
assert.equal(soloDescrizione[0]?.ricambioNome, "Vite M8");

const header = mapCaptureHeaderToIngressoSlice([
  row("cliente", "CAB Meccanica"),
  row("targa_matricola", "XY789ZZ"),
]);
assert.equal(header.cliente, "CAB Meccanica");
assert.equal(header.targa, "XY789ZZ");

const ric = mapCaptureFieldsToRicambi([
  row("cliente", "CAB Meccanica"),
  row("targa_matricola", "XY789ZZ"),
  ...twoRows,
]);
assert.equal(ric.identificazioneMacchina, "XY789ZZ");
assert.equal(ric.righe.length, 2);

const sparse = parseCaptureRicambiRighe([
  row("riga_1_nome", "A"),
  row("riga_1_codice", "A1"),
  row("riga_1_qt", "1"),
  row("riga_3_nome", "C"),
  row("riga_3_codice", "C3"),
  row("riga_3_qt", "2"),
]);
assert.equal(sparse.length, 2);
assert.equal(sparse[1]?.ricambioNome, "C");

const bundle = buildCaptureSchedeBundle({
  lavorazioneId: "lav-1",
  fields: [
    row("scheda_tipo", "ricambi"),
    row("cliente", "Cliente Ricambi"),
    row("targa_matricola", "MAT-123"),
    row("riga_1_nome", "Pastiglia freno"),
    row("riga_1_codice", "PF-01"),
    row("riga_1_qt", "4"),
  ],
  createdBy: "test",
  includeRicambi: true,
});
assert.equal(bundle.ingresso?.campi.cliente, "Cliente Ricambi");
assert.equal(bundle.ricambi?.campi.righe.length, 1);
assert.equal(bundle.ricambi?.campi.righe[0]?.ricambioNome, "Pastiglia freno");
assert.equal(bundle.ricambi?.campi.identificazioneMacchina, "MAT-123");

console.log("capture-ricambi-field-mapper.test.ts OK");
