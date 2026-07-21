import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  applyCompatExpansionToFormState,
  emptyRicambioForm,
  parseCompatInput,
} from "@/lib/magazzino/form";
import { buildRicambioCompatExpandOptions } from "@/lib/magazzino/resolve-mezzi-liste-for-compat";
import { isCompatMarcaUniversalLine, marcaUniversalCompatLabel } from "@/lib/magazzino/ricambio-compat-resolver";

const baseMezziListe: MezziListePrefs = {
  clienti: [],
  utilizzatori: [],
  cantieri: [],
  marche: [],
  modelli: [],
  tipiAttrezzatura: [],
  stati: [],
  attrezzature: [{ id: "m-fiat", nome: "Fiat", modelli: [] }],
  telai: [],
};

const fleetTree = [
  {
    id: "fleet-fiat",
    nome: "Fiat",
    modelli: [{ id: "fleet-du", nome: "Ducato" }],
  },
];

const fiatDucato = compatLabelMarcaModello("Fiat", "Ducato");

const form = {
  ...emptyRicambioForm(),
  marca: "BOSCH",
  compatibilitaMezzi: fiatDucato,
  compatMarcheAttrezzaturaFiltro: "Fiat",
};

const withoutFleet = buildRicambioCompatExpandOptions({ mezziListe: baseMezziListe });
const expandedWithoutFleet = applyCompatExpansionToFormState(form, withoutFleet.mezziListe);
const linesWithoutFleet = parseCompatInput(expandedWithoutFleet.compatibilitaMezzi);
assert.ok(
  linesWithoutFleet.some((line) => isCompatMarcaUniversalLine(line)),
  "senza fleet merge: universale per marca",
);
assert.ok(!linesWithoutFleet.includes(fiatDucato), "senza fleet merge: modello fleet-only filtrato");

const withFleet = buildRicambioCompatExpandOptions({
  mezziListe: baseMezziListe,
  fleetAttrezzatureTree: fleetTree,
});
const expandedWithFleet = applyCompatExpansionToFormState(form, withFleet.mezziListe);
const linesWithFleet = parseCompatInput(expandedWithFleet.compatibilitaMezzi);
assert.ok(linesWithFleet.includes(fiatDucato), "con fleet merge: modello esplicito persistito");
assert.ok(!linesWithFleet.some((line) => isCompatMarcaUniversalLine(line)), "con fleet merge: no universale se modello presente");

console.log("resolve-mezzi-liste-for-compat.test.ts OK");
