import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { buildCompatMetaForSave } from "@/lib/magazzino/compat/build-compat-meta";
import { resolveCompatibilitaRicambio } from "@/lib/magazzino/compat/resolve-compatibilita-ricambio";
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
const fiatUniversal = marcaUniversalCompatLabel("FIAT");

const refs = [{ tree: "attrezzature" as const, marcaId: "m-fiat", modelloId: "mod-500" }];
const built = buildCompatMetaForSave(refs, mezziListe);
assert.deepEqual(built.compatibilitaMezzi, [fiat500]);

const resolved = resolveCompatibilitaRicambio(
  { compatibilitaRefs: refs, compatibilitaMezzi: [fiat500] },
  mezziListe,
);
assert.equal(resolved.display, "FIAT 500");
assert.equal(resolved.isUniversal, false);

const universal = resolveCompatibilitaRicambio({ compatibilitaMezzi: [], compatibilitaRefs: [] }, mezziListe);
assert.equal(universal.isUniversal, true);
assert.equal(universal.display, "Universale (tutte le macchine)");

const fromLegacy = resolveCompatibilitaRicambio(
  { compatibilitaMezzi: [fiat500, compatLabelMarcaModello("FIAT", "Panda")] },
  mezziListe,
);
assert.deepEqual(fromLegacy.labels, [fiatUniversal]);

const dualLegacy = resolveCompatibilitaRicambio(
  { compatibilitaMezzi: [fiatUniversal, fiat500] },
  mezziListe,
);
assert.deepEqual(dualLegacy.labels, [fiat500]);
assert.equal(dualLegacy.display, "FIAT 500");

const dualRefs = [
  { tree: "attrezzature" as const, marcaId: "m-fiat", modelloId: "mod-500" },
  { tree: "attrezzature" as const, marcaId: "m-fiat" },
];
const dualRefsResolved = resolveCompatibilitaRicambio({ compatibilitaRefs: dualRefs }, mezziListe);
assert.deepEqual(dualRefsResolved.labels, [fiat500]);
assert.equal(dualRefsResolved.display, "FIAT 500");

console.log("resolve-compatibilita-ricambio.test.ts OK");
