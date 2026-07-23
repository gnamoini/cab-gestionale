import assert from "node:assert/strict";
import {
  findExactRicambioByCodice,
  suggestRicambiCodiciForCapture,
} from "@/lib/document-capture/capture-ricambi-codice-suggest";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

function mag(id: string, codice: string, descrizione: string): RicambioMagazzino {
  return {
    id,
    codiceFornitoreOriginale: codice,
    codiceFornitoreOriginaleSecondario: "",
    codiceFornitoreNonOriginale: "",
    descrizione,
    marca: "",
    categoria: "",
    quantita: 5,
    stockVersion: 1,
    prezzoAcquisto: 0,
    prezzoVendita: 0,
    markupPercentuale: 0,
    unitaMisura: "pz",
    fornitoriAlternativi: [],
    compatibilitaMezzi: [],
    note: "",
    createdAt: "",
    updatedAt: "",
  } as RicambioMagazzino;
}

const pool = [mag("r1", "ABC0", "Filtro A"), mag("r2", "XYZ99", "Guarnizione")];

const exact = findExactRicambioByCodice("ABC0", pool);
assert.equal(exact?.id, "r1");

const fuzzyO = suggestRicambiCodiciForCapture("ABCO", pool);
assert.ok(fuzzyO.some((s) => s.item.id === "r1"), "ABCO should match ABC0");

const ranked = suggestRicambiCodiciForCapture("XYZ", pool);
assert.equal(ranked[0]?.item.id, "r2");

console.log("capture-ricambi-codice-suggest.test.ts OK");
