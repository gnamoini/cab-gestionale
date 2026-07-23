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
assert.equal(righe[0]?.dataLavorazione, "");
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

const blockFormat = parseCaptureLavorazioniRighe([
  row("riga_1_lavorazione", "RICERCO GUASTO SU IMP. ELETTRICO INNESTO PTO"),
  row("riga_2_lavorazione", "APERTURA CENTRALINA E QUADRO IN CABINA"),
  row("riga_3_lavorazione", "TROVATO N° 2 PORTAFUSIBILI NEL VANO BATTERIA"),
  row("riga_3_nome", "ANGM2"),
  row("riga_3_ore", "2"),
  row("riga_3_data", "21/07/2026"),
]);
assert.equal(blockFormat.length, 1);
assert.equal(blockFormat[0]?.dataLavorazione, "21/07/2026");
assert.ok(blockFormat[0]?.lavorazioniEffettuate.toLowerCase().includes("ricerco guasto"));
assert.ok(blockFormat[0]?.lavorazioniEffettuate.toLowerCase().includes("apertura centralina"));
assert.equal(blockFormat[0]?.addettiAssegnati[0]?.addetto, "ANGM2");
assert.equal(blockFormat[0]?.addettiAssegnati[0]?.oreImpiegate, 2);

const perLineSameDate = parseCaptureLavorazioniRighe([
  row("riga_1_lavorazione", "Lavoro A"),
  row("riga_1_data", "22/07/2026"),
  row("riga_2_lavorazione", "Lavoro B"),
  row("riga_2_data", "22/07/2026"),
  row("riga_3_lavorazione", "Lavoro C"),
  row("riga_3_data", "22/07/2026"),
  row("riga_3_nome", "Paolo"),
  row("riga_3_ore", "4"),
]);
assert.equal(perLineSameDate.length, 1);
assert.equal(perLineSameDate[0]?.dataLavorazione, "22/07/2026");
assert.equal(lineCount(perLineSameDate[0]?.lavorazioniEffettuate ?? ""), 3);
assert.equal(perLineSameDate[0]?.addettiAssegnati[0]?.addetto, "Paolo");

const dateFirstBlocks = parseCaptureLavorazioniRighe([
  row("riga_1_data", "30/10/2024"),
  row("riga_1_nome", "Anghi"),
  row("riga_1_ore", "2"),
  row("riga_2_lavorazione", "REVISIONE IMPIANTO ELETTRICO NEL VANO BATTERIA"),
  row("riga_3_data", "30/10/2024"),
  row("riga_3_nome", "Anghi"),
  row("riga_3_ore", "1"),
  row("riga_4_lavorazione", "SOSTITUZIONE N° 2 PORTAFUSIBILI + 2 FUSIBILI 40 AMP. NEL VANO BATTERIE"),
  row("riga_5_data", "30/10/2024"),
  row("riga_5_nome", "Anghi"),
  row("riga_5_ore", "1"),
]);
assert.equal(dateFirstBlocks.length, 2);
assert.equal(dateFirstBlocks[0]?.dataLavorazione, "30/10/2024");
assert.ok(dateFirstBlocks[0]?.lavorazioniEffettuate.toLowerCase().includes("revisione impianto elettrico"));
assert.ok(dateFirstBlocks[1]?.lavorazioniEffettuate.toLowerCase().includes("sostituzione"));
assert.equal(dateFirstBlocks[0]?.addettiAssegnati[0]?.addetto, "Anghi");

const unreadableDate = parseCaptureLavorazioniRighe([
  row("riga_1_lavorazione", "Manutenzione"),
  row("riga_1_nome", "Paolo"),
  row("riga_1_ore", "1"),
  row("riga_1_data", "non-una-data"),
]);
assert.equal(unreadableDate[0]?.dataLavorazione, "");

function lineCount(text: string): number {
  return text.split("\n").filter((l) => l.trim()).length;
}

console.log("capture-lavorazioni-field-mapper.test.ts OK");
