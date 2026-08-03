import assert from "node:assert/strict";
import { flattenHierarchyRenameLabels } from "@/lib/settings/settings-rename-labels";

assert.deepEqual(flattenHierarchyRenameLabels([]), []);
assert.deepEqual(
  flattenHierarchyRenameLabels([
    { id: "1", nome: "Marca A", modelli: [{ id: "m1", nome: "Modello 1" }] },
    { id: "2", nome: "Marca B", modelli: [] },
  ]),
  ["Marca A", "Modello 1", "Marca B"],
);

console.log("settings-rename-labels.test.ts OK");
