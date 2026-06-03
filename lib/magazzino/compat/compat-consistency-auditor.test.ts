import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { auditCompatConsistency } from "@/lib/magazzino/compat/compat-consistency-auditor";

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
const refs = [{ tree: "attrezzature" as const, marcaId: "m-fiat", modelloId: "mod-500" }];

const ok = auditCompatConsistency(
  { id: "r1", compatibilitaRefs: refs, compatibilitaMezzi: [fiat500] },
  mezziListe,
);
assert.equal(ok.status, "ok");

const mismatch = auditCompatConsistency(
  {
    id: "r2",
    compatibilitaRefs: refs,
    compatibilitaMezzi: [compatLabelMarcaModello("FIAT", "Panda")],
  },
  mezziListe,
);
assert.equal(mismatch.status, "repairable");
assert.ok(mismatch.issues.includes("refs_legacy_mismatch"));
assert.ok(mismatch.suggestedFix);

const legacyOnly = auditCompatConsistency(
  { id: "r3", compatibilitaMezzi: [fiat500] },
  mezziListe,
);
assert.equal(legacyOnly.status, "repairable");
assert.ok(legacyOnly.issues.includes("legacy_only_no_refs"));
assert.ok(!legacyOnly.issues.includes("legacy_not_derivable"));

const legacySpaceVariant = auditCompatConsistency(
  {
    id: "r5",
    compatibilitaMezzi: [compatLabelMarcaModello("FIAT", "500 X")],
    compatibilitaRefs: [],
  },
  {
    ...mezziListe,
    attrezzature: [
      {
        id: "m-fiat",
        nome: "FIAT",
        modelli: [{ id: "mod-500x", nome: "500X" }],
      },
    ],
  },
);
assert.equal(legacySpaceVariant.status, "repairable");
assert.ok(legacySpaceVariant.issues.includes("legacy_only_no_refs"));
assert.ok(legacySpaceVariant.suggestedFix);

const orphan = auditCompatConsistency(
  {
    id: "r4",
    compatibilitaRefs: [{ tree: "attrezzature", marcaId: "missing", modelloId: "missing" }],
    compatibilitaMezzi: [],
  },
  mezziListe,
);
assert.equal(orphan.status, "warn");
assert.ok(orphan.issues.includes("orphan_refs"));
assert.ok(orphan.diff.orphanCount > 0);

console.log("compat-consistency-auditor.test.ts OK");
