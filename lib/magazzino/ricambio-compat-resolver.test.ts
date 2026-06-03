import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { compatDisplayLabel, compatLineDisplayText } from "@/lib/magazzino/compat/compat-display";
import {
  collapseLegacyExpandedMarcaUniversal,
  isCompatMarcaUniversalLine,
  labelToCompatRef,
  labelsToCompatRefs,
  marcaUniversalCompatLabel,
  refsToCompatLabels,
  resolveRicambioCompatLabels,
} from "@/lib/magazzino/ricambio-compat-resolver";

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
      id: "m-fiat",
      nome: "FIAT",
      modelli: [
        { id: "mod-500", nome: "500" },
        { id: "mod-panda", nome: "Panda" },
      ],
    },
  ],
  telai: [],
};

const fiat500 = compatLabelMarcaModello("FIAT", "500");
const fiatPanda = compatLabelMarcaModello("FIAT", "Panda");
const fiatUniversal = marcaUniversalCompatLabel("FIAT");

assert.equal(isCompatMarcaUniversalLine(fiatUniversal), true);
assert.equal(compatLineDisplayText(fiatUniversal), "FIAT (universale)");

const collapsed = collapseLegacyExpandedMarcaUniversal([fiat500, fiatPanda], mezziListe);
assert.deepEqual(collapsed, [fiatUniversal]);

const ref = labelToCompatRef(fiatUniversal, mezziListe);
assert.ok(ref);
assert.equal(ref!.marcaId, "m-fiat");
assert.equal(ref!.modelloId, undefined);

const refs = labelsToCompatRefs([fiat500], mezziListe);
assert.equal(refs.length, 1);
assert.equal(refs[0]!.modelloId, "mod-500");

const resolved = refsToCompatLabels(refs, mezziListe);
assert.deepEqual(resolved, [fiat500]);

const fromMeta = resolveRicambioCompatLabels([fiat500, fiatPanda], undefined, mezziListe);
assert.deepEqual(fromMeta, [fiatUniversal]);

const cleangoE6c = compatLabelMarcaModello("Schmidt", "Cleango 500 E6C");
const cleangoEtSpaced = compatLabelMarcaModello("Schmidt", "Cleango 500 ET");
const cleangoEtCompact = compatLabelMarcaModello("Schmidt", "Cleango 500ET");
assert.equal(
  compatDisplayLabel([cleangoE6c, cleangoEtSpaced, cleangoEtCompact]),
  "Schmidt Cleango 500 E6C, Schmidt Cleango 500 ET",
);

console.log("ricambio-compat-resolver.test.ts OK");
