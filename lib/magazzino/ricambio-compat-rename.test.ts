import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import { patchCompatLineRename, patchCompatMezziArray } from "@/lib/magazzino/ricambio-compat-rename";

const line = compatLabelMarcaModello("CAT", "320");

const marcaPatched = patchCompatLineRename(line, {
  kind: "hierarchy_marca_attrezzature",
  from: "CAT",
  to: "Caterpillar",
});
assert.equal(marcaPatched, compatLabelMarcaModello("Caterpillar", "320"));

const modelPatched = patchCompatLineRename(line, {
  kind: "hierarchy_modello_attrezzature",
  from: "320",
  to: "320D",
  marcaContext: "CAT",
});
assert.equal(modelPatched, compatLabelMarcaModello("CAT", "320D"));

const wrongMarca = patchCompatLineRename(line, {
  kind: "hierarchy_modello_attrezzature",
  from: "320",
  to: "320D",
  marcaContext: "IVECO",
});
assert.equal(wrongMarca, line);

const { next, changed } = patchCompatMezziArray([line], {
  kind: "hierarchy_marca_attrezzature",
  from: "CAT",
  to: "Caterpillar",
});
assert.equal(changed, true);
assert.equal(next[0], compatLabelMarcaModello("Caterpillar", "320"));

console.log("ricambio-compat-rename.test.ts OK");
