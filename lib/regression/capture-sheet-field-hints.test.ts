import assert from "node:assert/strict";
import { reconcileCaptureSheetHintAfterEdit } from "@/lib/document-capture/capture-sheet-field-hints";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

const magazzino: RicambioMagazzino[] = [
  {
    id: "r1",
    marca: "OEM",
    codiceFornitoreOriginale: "XYZ",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz",
    descrizione: "Filtro olio",
    note: "",
    categoria: "Filtri",
    compatibilitaMezzi: [],
    scorta: 5,
    scortaMinima: 1,
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
  },
];

const notFoundHint = {
  tone: "catalog" as const,
  message: "Ricambio non trovato in magazzino",
  meta: { fieldKey: "riga_1_codice", source: "ocr" as const, status: "WARNING" as const },
};

const reconciled = reconcileCaptureSheetHintAfterEdit("riga_1_codice", "XYZ", notFoundHint, { magazzino });
assert.equal(reconciled, null);

const stillBad = reconcileCaptureSheetHintAfterEdit("riga_1_codice", "ABC", notFoundHint, { magazzino });
assert.ok(stillBad);

console.log("capture-sheet-field-hints.test.ts OK");
