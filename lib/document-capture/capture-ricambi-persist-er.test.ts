import assert from "node:assert/strict";
import { parseCaptureRicambiRighe, type CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

function row(key: string, value: string): CaptureFieldRow {
  return { field_key: key, confirmed_value: value, normalized_value: value };
}

const magazzino = [
  {
    id: "mag-1",
    marca: "",
    codiceFornitoreOriginale: "FO-001",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz" as const,
    descrizione: "Filtro olio",
    note: "",
    categoria: "",
    compatibilitaMezzi: [],
    scorta: 1,
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
  },
] as RicambioMagazzino[];

const righe = parseCaptureRicambiRighe(
  [row("riga_1_codice", "FO-001"), row("riga_1_nome", "Filtro"), row("riga_1_qt", "2")],
  magazzino,
);
assert.equal(righe[0]?.ricambioId, "mag-1");
assert.equal(righe[0]?.codice, "FO-001");

console.log("capture-ricambi-persist-er.test.ts OK");
