import assert from "node:assert/strict";
import { mergeAttrezzatureMarcheTrees, resolveMezziListeWithFleetCatalog } from "@/lib/attrezzature/attrezzature-catalog";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";

const fleet = [{ id: "f1", nome: "FleetMarca", modelli: [{ id: "fm1", nome: "FM1" }] }];
const prefs = createMezziListePrefsDefault();
const merged = resolveMezziListeWithFleetCatalog(prefs, fleet);
assert.ok((merged.attrezzature ?? []).some((m) => m.nome === "FleetMarca"));

const both = mergeAttrezzatureMarcheTrees(fleet, prefs.attrezzature ?? []);
assert.ok(both.length >= 1);

console.log("attrezzature-catalog.test.ts OK");
