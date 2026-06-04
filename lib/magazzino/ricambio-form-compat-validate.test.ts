import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  applyCompatExpansionToFormState,
  emptyRicambioForm,
  validateRicambioListFields,
} from "@/lib/magazzino/form";
import { marcaUniversalCompatLabel } from "@/lib/magazzino/ricambio-compat-resolver";

const mezziListe: MezziListePrefs = {
  clienti: [],
  utilizzatori: [],
  cantieri: [],
  marche: [],
  modelli: [],
  tipiAttrezzatura: [],
  stati: [],
  attrezzature: [
    {
      id: "m-schmidt",
      nome: "Schmidt",
      modelli: [{ id: "mod-1", nome: "Cleango 400" }],
    },
  ],
  telai: [],
};

const obsolete = compatLabelMarcaModello("Schmidt", "Modello Rimosso");
const schmidtUniversal = marcaUniversalCompatLabel("Schmidt");

const form = {
  ...emptyRicambioForm(),
  marca: "BOSCH",
  compatibilitaMezzi: obsolete,
  compatMarcheAttrezzaturaFiltro: "Schmidt",
};

const err = validateRicambioListFields(form, {
  marche: ["BOSCH"],
  categorie: ["Generale"],
  mezziListe,
});

assert.equal(err, null, `expected save validation ok, got: ${err}`);

const expanded = applyCompatExpansionToFormState(form, mezziListe);
assert.ok(
  expanded.compatibilitaMezzi.includes(schmidtUniversal),
  "expanded compat should include Schmidt universal",
);
assert.ok(
  !expanded.compatibilitaMezzi.includes(obsolete),
  "obsolete compat line should be stripped on expand",
);

console.log("ricambio-form-compat-validate.test.ts OK");
