import assert from "node:assert/strict";
import { diffCompatLegacy } from "@/lib/magazzino/compat/build-compat-meta";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

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
      modelli: [{ id: "mod-500", nome: "500" }],
    },
  ],
  telai: [],
};

const refs = [{ tree: "attrezzature" as const, marcaId: "m-fiat", modelloId: "mod-500" }];
const canonical = compatLabelMarcaModello("FIAT", "500");
const stale = compatLabelMarcaModello("FIAT", "OldName");

const { mismatch, expected } = diffCompatLegacy(refs, [stale], mezziListe);
assert.equal(mismatch, true);
assert.deepEqual(expected, [canonical]);

const ok = diffCompatLegacy(refs, [canonical], mezziListe);
assert.equal(ok.mismatch, false);

console.log("compat-auto-heal.test.ts OK");
