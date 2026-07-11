import assert from "node:assert/strict";
import {
  captureCatalogWarningsByFieldKey,
  validateCaptureFieldsAgainstCatalogs,
} from "@/lib/document-capture/capture-catalog-validation";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

const addetti: AddettoRecord[] = [{ id: "a1", nome: "Mario", cognome: "Rossi" }];

const liste: MezziListePrefs = {
  clienti: ["Cliente Alfa"],
  utilizzatori: [],
  cantieri: ["Cantiere Nord"],
  marche: ["CAT"],
  modelli: [],
  tipiAttrezzatura: [],
  stati: [],
  tipiTelaio: [],
  telai: [],
};

const magazzino: RicambioMagazzino[] = [
  {
    id: "r1",
    marca: "CAT",
    codiceFornitoreOriginale: "ABC-123",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz",
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
];

const warnings = validateCaptureFieldsAgainstCatalogs({
  fields: [
    { field_key: "cliente", value: "Cliente Sconosciuto" },
    { field_key: "riga_1_nome", value: "Luca" },
    { field_key: "riga_2_codice", value: "ZZ-999" },
    { field_key: "riga_3_nome", value: "Pastiglia freni" },
    { field_key: "riga_3_descrizione", value: "Anteriori" },
  ],
  addettiRecords: addetti,
  mezziListe: liste,
  magazzino,
});

assert.equal(warnings.some((w) => w.fieldKey === "cliente"), true);
assert.equal(warnings.some((w) => w.fieldKey === "riga_1_nome"), true);
assert.equal(warnings.some((w) => w.fieldKey === "riga_2_codice"), true);
assert.equal(warnings.some((w) => w.message.includes("nessun codice")), true);

const byKey = captureCatalogWarningsByFieldKey(warnings);
assert.ok(byKey.get("cliente")?.length);

const ok = validateCaptureFieldsAgainstCatalogs({
  fields: [
    { field_key: "cliente", value: "Cliente Alfa" },
    { field_key: "riga_1_lavorazione", value: "Tagliando" },
    { field_key: "riga_1_nome", value: "Mario" },
    { field_key: "riga_2_codice", value: "ABC-123" },
  ],
  addettiRecords: addetti,
  mezziListe: liste,
  magazzino,
});
assert.equal(ok.length, 0);

const sparseListe: MezziListePrefs = {
  ...liste,
  clienti: ["Cliente Alfa", undefined as unknown as string, ""],
  telai: [{ id: "t1", nome: "IVECO", modelli: [] }],
};

const sparseWarnings = validateCaptureFieldsAgainstCatalogs({
  fields: [{ field_key: "telaio_marca", value: "IVECO" }],
  addettiRecords: addetti,
  mezziListe: sparseListe,
  magazzino,
});
assert.equal(sparseWarnings.length, 0);

const sparseUnknown = validateCaptureFieldsAgainstCatalogs({
  fields: [{ field_key: "telaio_marca", value: "MAN" }],
  addettiRecords: addetti,
  mezziListe: sparseListe,
  magazzino,
});
assert.equal(sparseUnknown.length, 1);

const missingListe = validateCaptureFieldsAgainstCatalogs({
  fields: [{ field_key: "cliente", value: "X" }],
  addettiRecords: [],
  mezziListe: undefined as unknown as MezziListePrefs,
  magazzino: [],
});
assert.equal(missingListe.length, 0);

console.log("capture-catalog-validation.test.ts OK");
