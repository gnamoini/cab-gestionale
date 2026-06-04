import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import { compatHierarchyMultiAddValue } from "@/lib/magazzino/compat/compat-hierarchy-add-value";

assert.equal(compatHierarchyMultiAddValue("marca", "Schmidt"), "Schmidt");

const full = compatLabelMarcaModello("Schmidt", "Cleango 400");
assert.equal(compatHierarchyMultiAddValue("modello", full, "Schmidt"), full);

assert.equal(
  compatHierarchyMultiAddValue("modello", "Cleango 400", "Schmidt"),
  compatLabelMarcaModello("Schmidt", "Cleango 400"),
);

assert.equal(compatHierarchyMultiAddValue("modello", "Cleango 400", ""), null);

console.log("compat-hierarchy-add-value.test.ts OK");
