import assert from "node:assert/strict";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import {
  ricambiResolutionBlocksApply,
  resolveRicambiRowsFromCaptureFields,
} from "@/lib/document-capture/ricambi-resolution";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

function field(key: string, value: string): CaptureFieldRow {
  return { field_key: key, confirmed_value: value, normalized_value: value };
}

function ricambio(
  partial: Pick<RicambioMagazzino, "id" | "codiceFornitoreOriginale" | "descrizione"> &
    Partial<Pick<RicambioMagazzino, "codiceFornitoreOriginaleSecondario">>,
): RicambioMagazzino {
  return {
    marca: "",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz",
    note: "",
    categoria: "",
    compatibilitaMezzi: [],
    scorta: 0,
    scortaMinima: 0,
    dataUltimaModifica: "",
    autoreUltimaModifica: "",
    prezzoFornitoreOriginale: 0,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 0,
    fornitoriAlternativi: [],
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
    ...partial,
  };
}

const magazzino = [
  ricambio({ id: "a", codiceFornitoreOriginale: "X1", descrizione: "Ricambio A" }),
  ricambio({
    id: "b",
    codiceFornitoreOriginale: "X1B",
    codiceFornitoreOriginaleSecondario: "X1",
    descrizione: "Ricambio B",
  }),
];

const matched = resolveRicambiRowsFromCaptureFields([field("riga_1_codice", "X1")], magazzino);
assert.equal(matched[0]?.status, "MATCHED");
assert.equal(matched[0]?.ricambioId, "a");

const notFound = resolveRicambiRowsFromCaptureFields([field("riga_1_codice", "X1")], []);
assert.equal(notFound[0]?.status, "NOT_FOUND");
assert.equal(ricambiResolutionBlocksApply(notFound), true);

console.log("ricambi-resolution.test.ts OK");
