import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { buildCompatMetaForSave } from "@/lib/magazzino/compat/build-compat-meta";
import {
  detectLegacyWriteRisk,
  devInvariantCompatWriteGuard,
  legacyToSSOTWriteAdapter,
  normalizeCompatWrite,
  resetCompatWriteGuardWarningsForTest,
  writeCompatibilitaRicambio,
} from "@/lib/magazzino/compat/compat-write-gate";

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
const refs = [{ tree: "attrezzature" as const, marcaId: "m-fiat", modelloId: "mod-500" }];

const legacyOnly = normalizeCompatWrite({ compatibilitaMezzi: [fiat500] });
assert.equal(detectLegacyWriteRisk(legacyOnly, mezziListe).risk, "legacy_only");
assert.equal(detectLegacyWriteRisk(legacyOnly, undefined).risk, "missing_mezzi_liste");

const adapted = legacyToSSOTWriteAdapter(legacyOnly, mezziListe);
assert.ok(adapted.compatibilitaRefs && adapted.compatibilitaRefs.length > 0);

const ssotWrite = writeCompatibilitaRicambio(
  { compatibilitaMezzi: [fiat500], compatibilitaRefs: undefined },
  mezziListe,
  "test.legacyToSsot",
);
assert.deepEqual(ssotWrite, buildCompatMetaForSave(refs, mezziListe));

const mismatchInput = {
  compatibilitaRefs: refs,
  compatibilitaMezzi: [compatLabelMarcaModello("FIAT", "Panda")],
};
assert.equal(detectLegacyWriteRisk(mismatchInput, mezziListe).risk, "legacy_mismatch_refs");
const corrected = writeCompatibilitaRicambio(mismatchInput, mezziListe, "test.mismatch");
assert.deepEqual(corrected.compatibilitaMezzi, [fiat500]);

const refsOnly = writeCompatibilitaRicambio({ compatibilitaRefs: refs, compatibilitaMezzi: [] }, mezziListe, "test.refsOnly");
assert.deepEqual(refsOnly.compatibilitaRefs, refs);
assert.deepEqual(refsOnly.compatibilitaMezzi, [fiat500]);

resetCompatWriteGuardWarningsForTest();
let warnCount = 0;
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  warnCount++;
  origWarn(...args);
};
const prevEnv = process.env.NODE_ENV;
(process.env as { NODE_ENV?: string }).NODE_ENV = "development";
devInvariantCompatWriteGuard("test-dedupe", { risk: "legacy_only" });
devInvariantCompatWriteGuard("test-dedupe", { risk: "legacy_only" });
assert.equal(warnCount, 1);
(process.env as { NODE_ENV?: string }).NODE_ENV = "production";
warnCount = 0;
resetCompatWriteGuardWarningsForTest();
devInvariantCompatWriteGuard("test-prod-silent", { risk: "legacy_only" });
assert.equal(warnCount, 0);
(process.env as { NODE_ENV?: string }).NODE_ENV = prevEnv;
console.warn = origWarn;

console.log("compat-write-gate.test.ts OK");
