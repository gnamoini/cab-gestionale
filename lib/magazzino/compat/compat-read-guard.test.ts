import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  devInvariantCompatReadGuard,
  readCompatDisplayForUi,
  readCompatLabelsForUi,
  readCompatSortKeyForUi,
  resetCompatReadGuardWarningsForTest,
} from "@/lib/magazzino/compat/compat-read-guard";
import { resolveCompatibilitaRicambio } from "@/lib/magazzino/compat/resolve-compatibilita-ricambio";

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

const fiat500 = compatLabelMarcaModello("FIAT", "500");
const input = {
  id: "r1",
  compatibilitaMezzi: [fiat500],
  compatibilitaRefs: [{ tree: "attrezzature" as const, marcaId: "m-fiat", modelloId: "mod-500" }],
};

assert.deepEqual(
  readCompatLabelsForUi(input, mezziListe, "test.labels"),
  resolveCompatibilitaRicambio(input, mezziListe).labels,
);
assert.equal(
  readCompatSortKeyForUi(input, mezziListe, "test.sortKey"),
  resolveCompatibilitaRicambio(input, mezziListe).sortKey,
);
assert.equal(
  readCompatDisplayForUi(input, mezziListe, "test.display"),
  resolveCompatibilitaRicambio(input, mezziListe).display,
);

assert.deepEqual(
  readCompatLabelsForUi(input, undefined, "test.labels-no-liste"),
  resolveCompatibilitaRicambio(input, undefined).labels,
);

resetCompatReadGuardWarningsForTest();
let warnCount = 0;
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  warnCount++;
  origWarn(...args);
};
const prevEnv = process.env.NODE_ENV;
(process.env as { NODE_ENV?: string }).NODE_ENV = "development";
devInvariantCompatReadGuard("test-dedupe", { accessKind: "labels" });
devInvariantCompatReadGuard("test-dedupe", { accessKind: "labels" });
assert.equal(warnCount, 1);
(process.env as { NODE_ENV?: string }).NODE_ENV = "production";
warnCount = 0;
resetCompatReadGuardWarningsForTest();
devInvariantCompatReadGuard("test-prod-silent", { accessKind: "labels" });
assert.equal(warnCount, 0);
(process.env as { NODE_ENV?: string }).NODE_ENV = prevEnv;
console.warn = origWarn;

console.log("compat-read-guard.test.ts OK");
