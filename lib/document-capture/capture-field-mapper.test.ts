import assert from "node:assert/strict";
import { mapCaptureFieldsToIngresso, type CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";

function row(field_key: string, value: string): CaptureFieldRow {
  return { field_key, confirmed_value: value, normalized_value: value };
}

const fields: CaptureFieldRow[] = [
  row("attrezzatura_marca", "CAT"),
  row("telaio_marca", "Iveco"),
  row("nome", "Mario"),
  row("cognome", "Rossi"),
  row("telefono", "3331234567"),
  row("note", "Urgente"),
];

const out = mapCaptureFieldsToIngresso(fields);

assert.equal(out.marcaAttrezzatura, "CAT");
assert.equal(out.marcaTelaio, "Iveco");
assert.equal(out.richiedente, "Mario Rossi");
assert.equal(out.richiedenteTelefono, "3331234567");
assert.equal(out.noteIntervento, "Urgente");

const withRichiedente = mapCaptureFieldsToIngresso([
  row("richiedente", "Già compilato"),
  row("nome", "Ignorato"),
  row("cognome", "Ignorato"),
]);
assert.equal(withRichiedente.richiedente, "Già compilato");

console.log("capture-field-mapper.test.ts OK");
