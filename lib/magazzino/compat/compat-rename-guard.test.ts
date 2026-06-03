import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { regenerateCompatLegacyFromRefs } from "@/lib/magazzino/compat/compat-rename-guard";

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
      nome: "FIAT NEW",
      modelli: [{ id: "mod-500", nome: "500" }],
    },
  ],
  telai: [],
};

const meta = {
  compatibilitaRefs: [{ tree: "attrezzature", marcaId: "m-fiat", modelloId: "mod-500" }],
  compatibilitaMezzi: [compatLabelMarcaModello("FIAT OLD", "500")],
};

const { next, changed } = regenerateCompatLegacyFromRefs(meta, mezziListe);
assert.equal(changed, true);
assert.deepEqual(next.compatibilitaMezzi, [compatLabelMarcaModello("FIAT NEW", "500")]);

const legacyOnly = {
  compatibilitaMezzi: [compatLabelMarcaModello("FIAT OLD", "500")],
};
const patched = regenerateCompatLegacyFromRefs(legacyOnly, mezziListe, {
  kind: "hierarchy_marca_attrezzature",
  from: "FIAT OLD",
  to: "FIAT NEW",
});
assert.equal(patched.changed, true);

console.log("compat-rename-guard.test.ts OK");
