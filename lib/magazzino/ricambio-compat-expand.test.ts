import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  expandRicambioCompatibilitaMezzi,
  marchePendingUniversalCompatExpand,
} from "@/lib/magazzino/ricambio-compat-expand";

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
      id: "m-iveco",
      nome: "Iveco",
      modelli: [
        { id: "mod-a", nome: "Daily" },
        { id: "mod-b", nome: "Eurocargo" },
      ],
    },
    {
      id: "m-cat",
      nome: "CAT",
      modelli: [{ id: "mod-c", nome: "320" }],
    },
  ],
  telai: [],
};

const ivecoDaily = compatLabelMarcaModello("Iveco", "Daily");
const ivecoEuro = compatLabelMarcaModello("Iveco", "Eurocargo");

const expanded = expandRicambioCompatibilitaMezzi([], {
  marcheAttrezzaturaFiltro: ["Iveco"],
  marcheTelaioFiltro: [],
  mezziListe,
});

assert.equal(expanded.length, 2);
assert.ok(expanded.includes(ivecoDaily));
assert.ok(expanded.includes(ivecoEuro));

const partial = expandRicambioCompatibilitaMezzi([ivecoDaily], {
  marcheAttrezzaturaFiltro: ["Iveco"],
  marcheTelaioFiltro: [],
  mezziListe,
});
assert.deepEqual(partial, [ivecoDaily]);

const pending = marchePendingUniversalCompatExpand([], {
  marcheAttrezzaturaFiltro: ["Iveco", "CAT"],
  marcheTelaioFiltro: [],
  mezziListe,
});
assert.deepEqual(pending.attrezzature, ["Iveco", "CAT"]);
assert.equal(pending.telai.length, 0);

console.log("ricambio-compat-expand.test.ts OK");
