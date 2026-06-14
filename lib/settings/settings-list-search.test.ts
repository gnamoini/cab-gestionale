import assert from "node:assert/strict";
import { filterSettingsHierarchyTree, filterSettingsStringList } from "@/lib/settings/settings-list-search";

const tree = [
  { id: "1", nome: "Piaggio", modelli: [{ id: "a", nome: "Porter" }] },
  { id: "2", nome: "Iveco", modelli: [{ id: "b", nome: "Daily" }] },
];

assert.deepEqual(filterSettingsStringList(["Autobren", "Bucher"], "buchr"), ["Bucher"]);

assert.deepEqual(
  filterSettingsHierarchyTree(tree, "paggio").map((m) => m.nome),
  ["Piaggio"],
);

assert.deepEqual(
  filterSettingsHierarchyTree(tree, "daly").map((m) => m.nome),
  ["Iveco"],
);

console.log("settings-list-search.test.ts ok");
