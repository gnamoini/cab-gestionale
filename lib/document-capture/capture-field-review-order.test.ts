import assert from "node:assert/strict";
import { sortCaptureReviewFields } from "@/lib/document-capture/capture-field-review-order";

function key(field_key: string) {
  return { field_key };
}

const ingressoShuffled = sortCaptureReviewFields([
  key("attrezzatura_matricola"),
  key("cantiere"),
  key("attrezzatura_marca"),
  key("data_ingresso"),
  key("cliente"),
  key("attrezzatura_modello"),
  key("utilizzatore"),
  key("descrizione_anomalia"),
  key("telaio_marca"),
  key("targa"),
  key("km"),
  key("telaio_modello"),
  key("n_scuderia"),
  key("ore"),
]);

assert.deepEqual(
  ingressoShuffled.map((r) => r.field_key),
  [
    "data_ingresso",
    "cliente",
    "cantiere",
    "utilizzatore",
    "attrezzatura_marca",
    "attrezzatura_modello",
    "attrezzatura_matricola",
    "n_scuderia",
    "ore",
    "telaio_marca",
    "telaio_modello",
    "targa",
    "km",
    "descrizione_anomalia",
  ],
);

const lavorazioniShuffled = sortCaptureReviewFields([
  key("riga_2_ore"),
  key("cliente"),
  key("riga_1_lavorazione"),
  key("targa_matricola"),
  key("riga_1_nome"),
  key("riga_1_ore"),
]);

assert.deepEqual(
  lavorazioniShuffled.map((r) => r.field_key),
  ["cliente", "targa_matricola", "riga_1_lavorazione", "riga_1_nome", "riga_1_ore", "riga_2_ore"],
);

console.log("capture-field-review-order.test.ts OK");
